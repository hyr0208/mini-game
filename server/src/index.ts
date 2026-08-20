import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type {
  BeatPlanEntry,
  ClientMessage,
  RoundResultEntry,
  SessionResultEntry,
  ServerMessage,
  TurnPlanEntry,
} from './protocol.js';
import {
  MAX_PLAYERS,
  createRoom,
  generateRoomCode,
  nextColor,
  shuffledGames,
  type Room,
} from './rooms.js';
import { createBots, simulateBotDeltaMs } from './bots.js';
import { RELAY_SCORE_TABLE, SYNC_SCORE_TABLE, judgeFromAbsDeltaMs } from './scoring.js';

const PORT = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map<string, Room>();

/** 라운드가 시작되기까지 host/player가 함께 보는 준비 시간 (ms). 클라이언트 상수와 반드시 맞춰야 한다. */
const ROUND_LEAD_MS = 3000;
/** 라운드 결과를 보여준 뒤 다음 라운드로 자동 진행하기까지 대기 시간 (ms) */
const ROUND_RESULT_DISPLAY_MS = 3500;
const ROUND_SAFETY_BUFFER_MS = 3000;

/** 타이밍 릴레이: 참가자 한 명의 턴에 배정된 시간 (ms). 클라이언트 상수와 반드시 맞춰야 한다. */
const TURN_DURATION_MS = 2000;
/** 다같이 완성하기: 박자 수 / 박자 간격 (ms). 클라이언트 상수와 반드시 맞춰야 한다. */
const BEAT_COUNT = 6;
const BEAT_INTERVAL_MS = 1200;

interface Participant {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  skill: number;
}

interface ConnState {
  roomCode: string | null;
  role: 'host' | 'player' | null;
  playerId: string | null;
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcastToRoom(room: Room, message: ServerMessage) {
  send(room.hostSocket, message);
  for (const p of room.players.values()) send(p.socket, message);
}

function broadcastPlayerList(room: Room) {
  const players = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  broadcastToRoom(room, { type: 'player_list', players });
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAllParticipants(room: Room): Participant[] {
  const real: Participant[] = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isBot: false,
    skill: 1,
  }));
  const bots: Participant[] = Array.from(room.bots.values()).map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    isBot: true,
    skill: b.skill,
  }));
  return [...real, ...bots];
}

function fillWithBots(room: Room) {
  room.bots = new Map();
  const needed = MAX_PLAYERS - room.players.size;
  if (needed <= 0) return;
  const usedColors = new Set(Array.from(room.players.values()).map((p) => p.color));
  for (const bot of createBots(needed, usedColors)) room.bots.set(bot.id, bot);
}

function startTimingRelayRound(room: Room, startAnchorServerTime: number): number {
  const order = shuffle(getAllParticipants(room));
  const plan: TurnPlanEntry[] = order.map((p, index) => {
    const turnStartOffsetMs = index * TURN_DURATION_MS;
    if (!p.isBot) {
      return { participantId: p.id, name: p.name, color: p.color, isBot: false, turnStartOffsetMs };
    }
    const deltaMs = simulateBotDeltaMs(p.skill);
    const judgement = judgeFromAbsDeltaMs(Math.abs(deltaMs));
    return {
      participantId: p.id,
      name: p.name,
      color: p.color,
      isBot: true,
      turnStartOffsetMs,
      botResult: { judgement, deltaMs },
    };
  });

  const roundIndex = room.currentRoundIndex;
  const totalRounds = room.sessionGames.length;

  send(room.hostSocket, {
    type: 'round_starting',
    gameId: 'timingRelay',
    roundIndex,
    totalRounds,
    startAnchorServerTime,
    turnPlan: plan,
  });

  for (const player of room.players.values()) {
    const mine = plan.find((entry) => entry.participantId === player.id);
    send(player.socket, {
      type: 'round_starting',
      gameId: 'timingRelay',
      roundIndex,
      totalRounds,
      startAnchorServerTime,
      myTurnOffsetMs: mine?.turnStartOffsetMs ?? 0,
    });
  }

  // 봇의 결과는 이미 정해져 있으므로 즉시 확정한다.
  for (const entry of plan) {
    if (!entry.isBot || !entry.botResult) continue;
    finalizePlayerRound(room, entry.participantId, RELAY_SCORE_TABLE[entry.botResult.judgement]);
  }

  return plan.length * TURN_DURATION_MS;
}

function startSyncBuildRound(room: Room, startAnchorServerTime: number): number {
  const participants = getAllParticipants(room);
  const beatPlan: BeatPlanEntry[] = participants
    .filter((p) => p.isBot)
    .map((bot) => ({
      participantId: bot.id,
      name: bot.name,
      color: bot.color,
      perBeatJudgement: Array.from({ length: BEAT_COUNT }, () =>
        judgeFromAbsDeltaMs(Math.abs(simulateBotDeltaMs(bot.skill))),
      ),
    }));

  const roundIndex = room.currentRoundIndex;
  const totalRounds = room.sessionGames.length;
  const base = {
    gameId: 'syncBuild' as const,
    roundIndex,
    totalRounds,
    startAnchorServerTime,
    beatCount: BEAT_COUNT,
    beatIntervalMs: BEAT_INTERVAL_MS,
  };

  send(room.hostSocket, { type: 'round_starting', ...base, beatPlan });
  for (const player of room.players.values()) {
    send(player.socket, { type: 'round_starting', ...base });
  }

  for (const entry of beatPlan) {
    const score = entry.perBeatJudgement.reduce((sum, j) => sum + SYNC_SCORE_TABLE[j], 0);
    finalizePlayerRound(room, entry.participantId, score);
  }

  return BEAT_COUNT * BEAT_INTERVAL_MS;
}

function startNextRound(room: Room) {
  room.currentRoundIndex += 1;

  if (room.currentRoundIndex >= room.sessionGames.length) {
    finishSession(room);
    return;
  }

  const gameId = room.sessionGames[room.currentRoundIndex];
  room.roundFinishedPlayerIds = new Set();
  room.roundScores = new Map();

  const startAnchorServerTime = Date.now() + ROUND_LEAD_MS;
  const activeDurationMs =
    gameId === 'timingRelay'
      ? startTimingRelayRound(room, startAnchorServerTime)
      : startSyncBuildRound(room, startAnchorServerTime);

  const roundIndexAtSchedule = room.currentRoundIndex;
  const safetyMs = ROUND_LEAD_MS + activeDurationMs + ROUND_SAFETY_BUFFER_MS;
  setTimeout(() => {
    if (rooms.get(room.code) !== room) return; // 그 사이 방이 닫혔으면 아무것도 하지 않는다
    if (room.currentRoundIndex !== roundIndexAtSchedule) return; // 이미 정상적으로 다음 라운드로 넘어갔다
    for (const p of room.players.values()) finalizePlayerRound(room, p.id, 0);
    for (const b of room.bots.values()) finalizePlayerRound(room, b.id, 0);
  }, safetyMs);
}

function finalizePlayerRound(room: Room, participantId: string, roundScore: number) {
  if (room.roundFinishedPlayerIds.has(participantId)) return;
  room.roundFinishedPlayerIds.add(participantId);
  room.roundScores.set(participantId, roundScore);

  const player = room.players.get(participantId);
  if (player) {
    player.totalScore += roundScore;
  } else {
    const bot = room.bots.get(participantId);
    if (bot) bot.totalScore += roundScore;
  }

  maybeFinishRound(room);
}

function buildRoundResults(room: Room): RoundResultEntry[] {
  const playerEntries = Array.from(room.players.values()).map((p) => ({
    playerId: p.id,
    name: p.name,
    color: p.color,
    roundScore: room.roundScores.get(p.id) ?? 0,
    totalScore: p.totalScore,
  }));
  const botEntries = Array.from(room.bots.values()).map((b) => ({
    playerId: b.id,
    name: b.name,
    color: b.color,
    roundScore: room.roundScores.get(b.id) ?? 0,
    totalScore: b.totalScore,
  }));
  return [...playerEntries, ...botEntries].sort((a, b) => b.totalScore - a.totalScore);
}

function maybeFinishRound(room: Room) {
  const totalParticipants = room.players.size + room.bots.size;
  if (room.roundFinishedPlayerIds.size < totalParticipants) return;

  const entries = buildRoundResults(room);
  broadcastToRoom(room, { type: 'round_result', entries });

  setTimeout(() => {
    if (rooms.get(room.code) !== room) return;
    startNextRound(room);
  }, ROUND_RESULT_DISPLAY_MS);
}

function finishSession(room: Room) {
  room.phase = 'finished';
  const playerEntries: SessionResultEntry[] = Array.from(room.players.values()).map((p) => ({
    playerId: p.id,
    name: p.name,
    color: p.color,
    totalScore: p.totalScore,
  }));
  const botEntries: SessionResultEntry[] = Array.from(room.bots.values()).map((b) => ({
    playerId: b.id,
    name: b.name,
    color: b.color,
    totalScore: b.totalScore,
  }));
  const entries = [...playerEntries, ...botEntries].sort((a, b) => b.totalScore - a.totalScore);

  broadcastToRoom(room, { type: 'session_finished', entries });
}

wss.on('connection', (socket) => {
  const state: ConnState = { roomCode: null, role: null, playerId: null };

  function currentRoom(): Room | undefined {
    return state.roomCode ? rooms.get(state.roomCode) : undefined;
  }

  function cleanup() {
    const room = currentRoom();
    if (!room) return;

    if (state.role === 'host') {
      for (const p of room.players.values()) {
        send(p.socket, { type: 'room_closed', reason: '호스트가 방을 나갔어요.' });
      }
      rooms.delete(room.code);
    } else if (state.playerId) {
      const player = room.players.get(state.playerId);
      if (player) {
        if (room.phase === 'lobby') {
          room.players.delete(state.playerId);
          broadcastPlayerList(room);
        } else {
          player.connected = false;
          finalizePlayerRound(room, state.playerId, 0);
        }
      }
    }
    state.roomCode = null;
    state.role = null;
    state.playerId = null;
  }

  socket.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create_room': {
        const code = generateRoomCode(new Set(rooms.keys()));
        const room = createRoom(code, socket);
        rooms.set(code, room);
        state.roomCode = code;
        state.role = 'host';
        send(socket, { type: 'room_created', roomCode: code });
        break;
      }

      case 'join_room': {
        const room = rooms.get(msg.roomCode.trim().toUpperCase());
        if (!room) {
          send(socket, { type: 'error', message: '방을 찾을 수 없어요.' });
          return;
        }
        if (room.phase !== 'lobby') {
          send(socket, { type: 'error', message: '이미 게임이 시작된 방이에요.' });
          return;
        }
        if (room.players.size >= MAX_PLAYERS) {
          send(socket, { type: 'error', message: '방이 가득 찼어요.' });
          return;
        }

        const playerId = randomUUID();
        const color = nextColor(room);
        room.players.set(playerId, {
          id: playerId,
          name: msg.name.trim().slice(0, 12) || 'Player',
          color,
          socket,
          connected: true,
          totalScore: 0,
        });
        state.roomCode = room.code;
        state.role = 'player';
        state.playerId = playerId;

        send(socket, { type: 'room_joined', roomCode: room.code, playerId, color });
        broadcastPlayerList(room);
        break;
      }

      case 'ping': {
        send(socket, { type: 'pong', t0: msg.t0, serverTime: Date.now() });
        break;
      }

      case 'start_session': {
        const room = currentRoom();
        if (!room || state.role !== 'host') return;
        if (room.players.size === 0) {
          send(socket, { type: 'error', message: '참가자가 없어요. 누군가 방에 참가한 뒤 시작해주세요.' });
          return;
        }

        room.phase = 'playing';
        room.sessionGames = shuffledGames();
        room.currentRoundIndex = -1;
        for (const p of room.players.values()) p.totalScore = 0;
        fillWithBots(room);

        startNextRound(room);
        break;
      }

      case 'round_live_score': {
        const room = currentRoom();
        if (!room || state.role !== 'player' || !state.playerId) return;
        broadcastToRoom(room, {
          type: 'round_live_update',
          playerId: state.playerId,
          score: msg.score,
        });
        break;
      }

      case 'round_score': {
        const room = currentRoom();
        if (!room || state.role !== 'player' || !state.playerId) return;
        finalizePlayerRound(room, state.playerId, msg.score);
        break;
      }

      case 'leave_room': {
        cleanup();
        break;
      }
    }
  });

  socket.on('close', cleanup);
});

console.log(`Rhythm party server listening on ws://localhost:${PORT}`);
