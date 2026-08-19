import type { WebSocket } from 'ws';
import type { GameId } from './protocol.js';

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
  totalScore: number;
}

export interface Room {
  code: string;
  hostSocket: WebSocket;
  players: Map<string, RoomPlayer>;
  phase: 'lobby' | 'playing' | 'finished';
  /** 이번 세션에서 진행할 게임 순서 (셔플됨) */
  sessionGames: GameId[];
  /** -1 = 세션 시작 전 */
  currentRoundIndex: number;
  /** simonSays 라운드의 정답. 호스트에게만 전달되고 서버가 채점 기준으로 보관한다. */
  currentSimonSequence: number[] | null;
  roundFinishedPlayerIds: Set<string>;
  /** 이번 라운드 각 플레이어의 최종 점수 */
  roundScores: Map<string, number>;
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
    phase: 'lobby',
    sessionGames: [],
    currentRoundIndex: -1,
    currentSimonSequence: null,
    roundFinishedPlayerIds: new Set(),
    roundScores: new Map(),
  };
}

export function shuffledGames(): GameId[] {
  const games: GameId[] = ['buttonMash', 'simonSays', 'aimClick'];
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  return games;
}

export function generateSimonSequence(length: number, colorCount: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * colorCount));
}
