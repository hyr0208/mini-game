import type { WebSocket } from 'ws';

export const MAX_PLAYERS = 4;
export const COLOR_PALETTE = ['#ff5d8f', '#5dd6ff', '#ffd15d', '#8bff5d'];

/** 헷갈리는 문자(0/O, 1/I 등)를 뺀 방 코드용 문자셋 */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  socket: WebSocket;
  connected: boolean;
  score: number;
  combo: number;
  maxCombo: number;
}

export interface Room {
  code: string;
  hostSocket: WebSocket;
  players: Map<string, RoomPlayer>;
  chartId: string | null;
  phase: 'lobby' | 'playing' | 'finished';
  finishedPlayerIds: Set<string>;
}

export function generateRoomCode(existing: ReadonlySet<string>): string {
  let code: string;
  do {
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
  } while (existing.has(code));
  return code;
}

export function nextColor(room: Room): string {
  const used = new Set(Array.from(room.players.values()).map((p) => p.color));
  return (
    COLOR_PALETTE.find((color) => !used.has(color)) ??
    COLOR_PALETTE[room.players.size % COLOR_PALETTE.length]
  );
}

export function createRoom(code: string, hostSocket: WebSocket): Room {
  return {
    code,
    hostSocket,
    players: new Map(),
    chartId: null,
    phase: 'lobby',
    finishedPlayerIds: new Set(),
  };
}
