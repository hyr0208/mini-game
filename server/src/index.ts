import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, GameId, RoundResultEntry, SessionResultEntry, ServerMessage } from './protocol.js';
import {
  MAX_PLAYERS,
  createRoom,
  generateRoomCode,
  generateSimonSequence,
  nextColor,
  shuffledGames,
  type Room,
} from './rooms.js';

const PORT = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map<string, Room>();

/** 라운드가 시작되기까지 host/player가 함께 보는 준비 시간 (ms). 클라이언트 상수와 반드시 맞춰야 한다. */
const ROUND_LEAD_MS = 3000;
/** 라운드 결과를 보여준 뒤 다음 라운드로 자동 진행하기까지 대기 시간 (ms) */
const ROUND_RESULT_DISPLAY_MS = 3500;

const SIMON_SEQUENCE_LENGTH = 5;
const SIMON_COLOR_COUNT = 4;
const SIMON_SCORE_PER_CORRECT_STEP = 200;
const SIMON_STEP_MS = 700;
const SIMON_INPUT_TIMEOUT_MS = 8000;
const BUTTON_MASH_DURATION_MS = 5000;
const AIM_DURATION_MS = 8000;

/** 게임별 최대 진행 시간 (ms). 클라이언트가 어떤 이유로든 응답을 보내지 않을 때 라운드가 영원히
 * 멈추지 않도록, 이 시간이 지나면 서버가 나서서 미제출 플레이어를 0점으로 강제 마감한다. */
const GAME_DURATION_MS: Record<GameId, number> = {
  buttonMash: BUTTON_MASH_DURATION_MS,
  simonSays: SIMON_SEQUENCE_LENGTH * SIMON_STEP_MS + SIMON_INPUT_TIMEOUT_MS,
  aimClick: AIM_DURATION_MS,
};
const ROUND_SAFETY_BUFFER_MS = 3000;

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

function startNextRound(room: Room) {
  room.currentRoundIndex += 1;

  if (room.currentRoundIndex >= room.sessionGames.length) {
    finishSession(room);
    return;
  }

  const gameId = room.sessionGames[room.currentRoundIndex];
  room.roundFinishedPlayerIds = new Set();
  room.roundScores = new Map();
  room.currentSimonSequence =
    gameId === 'simonSays' ? generateSimonSequence(SIMON_SEQUENCE_LENGTH, SIMON_COLOR_COUNT) : null;

  const startAnchorServerTime = Date.now() + ROUND_LEAD_MS;

  const playerMessage: ServerMessage = {
    type: 'round_starting',
    gameId,
    roundIndex: room.currentRoundIndex,
    totalRounds: room.sessionGames.length,
    startAnchorServerTime,
  };
  for (const p of room.players.values()) send(p.socket, playerMessage);

  send(room.hostSocket, {
    ...playerMessage,
    simonSequence: room.currentSimonSequence ?? undefined,
  });

  const roundIndexAtSchedule = room.currentRoundIndex;
  const safetyMs = ROUND_LEAD_MS + GAME_DURATION_MS[gameId] + ROUND_SAFETY_BUFFER_MS;
  setTimeout(() => {
    if (rooms.get(room.code) !== room) return; // 그 사이 방이 닫혔으면 아무것도 하지 않는다
    if (room.currentRoundIndex !== roundIndexAtSchedule) return; // 이미 정상적으로 다음 라운드로 넘어갔다
    for (const p of room.players.values()) {
      finalizePlayerRound(room, p.id, 0);
    }
  }, safetyMs);
}

function finalizePlayerRound(room: Room, playerId: string, roundScore: number) {
  if (room.roundFinishedPlayerIds.has(playerId)) return;
  room.roundFinishedPlayerIds.add(playerId);
  room.roundScores.set(playerId, roundScore);

  const player = room.players.get(playerId);
  if (player) player.totalScore += roundScore;

  maybeFinishRound(room);
}

function maybeFinishRound(room: Room) {
  if (room.roundFinishedPlayerIds.size < room.players.size) return;

  const entries: RoundResultEntry[] = Array.from(room.players.values())
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      color: p.color,
      roundScore: room.roundScores.get(p.id) ?? 0,
      totalScore: p.totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  broadcastToRoom(room, { type: 'round_result', entries });

  setTimeout(() => {
    if (rooms.get(room.code) !== room) return; // 그 사이 방이 닫혔으면 진행하지 않는다
    startNextRound(room);
  }, ROUND_RESULT_DISPLAY_MS);
}

function finishSession(room: Room) {
  room.phase = 'finished';
  const entries: SessionResultEntry[] = Array.from(room.players.values())
    .map((p) => ({ playerId: p.id, name: p.name, color: p.color, totalScore: p.totalScore }))
    .sort((a, b) => b.totalScore - a.totalScore);

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
        if (!room || state.role !== 'host' || room.players.size === 0) return;

        room.phase = 'playing';
        room.sessionGames = shuffledGames();
        room.currentRoundIndex = -1;
        for (const p of room.players.values()) p.totalScore = 0;

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

      case 'simon_guess': {
        const room = currentRoom();
        if (!room || state.role !== 'player' || !state.playerId) return;
        const answer = room.currentSimonSequence ?? [];

        let correctPrefix = 0;
        for (let i = 0; i < msg.sequence.length && i < answer.length; i++) {
          if (msg.sequence[i] !== answer[i]) break;
          correctPrefix += 1;
        }
        const fullyCorrect = correctPrefix === answer.length && msg.sequence.length === answer.length;
        const roundScore = fullyCorrect
          ? SIMON_SCORE_PER_CORRECT_STEP * answer.length
          : correctPrefix * SIMON_SCORE_PER_CORRECT_STEP;

        finalizePlayerRound(room, state.playerId, roundScore);
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
