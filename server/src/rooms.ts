import type { WebSocket } from 'ws';
import type { GameId } from './protocol.js';
import type { BotParticipant } from './bots.js';

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
  /** 세션 시작 시 사람 수가 4명 미만이면 남는 자리를 채우는 CPU 참가자 */
  bots: Map<string, BotParticipant>;
  phase: 'lobby' | 'playing' | 'finished';
  /** 이번 세션에서 진행할 게임 순서 (셔플됨) */
  sessionGames: GameId[];
  /** -1 = 세션 시작 전 */
  currentRoundIndex: number;
  roundFinishedPlayerIds: Set<string>;
  /** 이번 라운드 각 참가자의 최종 점수 */
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
    bots: new Map(),
    phase: 'lobby',
    sessionGames: [],
    currentRoundIndex: -1,
    roundFinishedPlayerIds: new Set(),
    roundScores: new Map(),
  };
}

export function shuffledGames(): GameId[] {
  const games: GameId[] = ['timingRelay', 'syncBuild'];
  for (let i = games.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [games[i], games[j]] = [games[j], games[i]];
  }
  return games;
}
