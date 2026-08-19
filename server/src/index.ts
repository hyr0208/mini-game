import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, PlayerResult, ServerMessage } from './protocol.js';
import { MAX_PLAYERS, createRoom, generateRoomCode, nextColor, type Room } from './rooms.js';

const PORT = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port: PORT });

const rooms = new Map<string, Room>();

interface ConnState {
  roomCode: string | null;
  role: 'host' | 'player' | null;
  playerId: string | null;
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcastPlayerList(room: Room) {
  const players = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  send(room.hostSocket, { type: 'player_list', players });
  for (const p of room.players.values()) send(p.socket, { type: 'player_list', players });
}

function buildResults(room: Room): PlayerResult[] {
  return Array.from(room.players.values())
    .map((p) => ({ id: p.id, name: p.name, color: p.color, score: p.score, maxCombo: p.maxCombo }))
    .sort((a, b) => b.score - a.score);
}

function maybeFinishGame(room: Room) {
  if (room.phase !== 'playing') return;
  if (room.finishedPlayerIds.size < room.players.size) return;

  room.phase = 'finished';
  const results = buildResults(room);
  send(room.hostSocket, { type: 'game_finished', results });
  for (const p of room.players.values()) send(p.socket, { type: 'game_finished', results });
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
          room.finishedPlayerIds.add(state.playerId);
          maybeFinishGame(room);
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
          score: 0,
          combo: 0,
          maxCombo: 0,
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

      case 'select_song': {
        const room = currentRoom();
        if (!room || state.role !== 'host') return;
        room.chartId = msg.chartId;
        for (const p of room.players.values()) {
          send(p.socket, { type: 'song_selected', chartId: msg.chartId });
        }
        break;
      }

      case 'start_game': {
        const room = currentRoom();
        if (!room || state.role !== 'host' || !room.chartId) return;

        room.phase = 'playing';
        room.finishedPlayerIds.clear();
        for (const p of room.players.values()) {
          p.score = 0;
          p.combo = 0;
          p.maxCombo = 0;
        }

        const startMessage: ServerMessage = {
          type: 'game_starting',
          chartId: room.chartId,
          startAnchorServerTime: msg.startAnchorServerTime,
        };
        send(room.hostSocket, startMessage);
        for (const p of room.players.values()) send(p.socket, startMessage);
        break;
      }

      case 'player_update': {
        const room = currentRoom();
        if (!room || state.role !== 'player' || !state.playerId) return;
        const player = room.players.get(state.playerId);
        if (!player) return;

        player.score = msg.score;
        player.combo = msg.combo;
        player.maxCombo = Math.max(player.maxCombo, msg.combo);
        const updateMessage: ServerMessage = {
          type: 'player_update',
          playerId: state.playerId,
          score: player.score,
          combo: player.combo,
        };
        // 호스트뿐 아니라 참가자 전원에게도 알려서 각자 화면에서 실시간 순위를 볼 수 있게 한다.
        send(room.hostSocket, updateMessage);
        for (const p of room.players.values()) send(p.socket, updateMessage);
        break;
      }

      case 'player_finished': {
        const room = currentRoom();
        if (!room || state.role !== 'player' || !state.playerId) return;
        const player = room.players.get(state.playerId);
        if (!player) return;

        player.score = msg.score;
        player.maxCombo = Math.max(player.maxCombo, msg.maxCombo);
        room.finishedPlayerIds.add(state.playerId);
        maybeFinishGame(room);
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
