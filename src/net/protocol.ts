/**
 * server/src/protocol.ts와 반드시 동일하게 맞춰야 하는 WebSocket 메시지 타입 정의.
 * 별도 패키지라 공유 임포트 대신 수동으로 복제해서 관리한다.
 */

export type GameId = 'buttonMash' | 'simonSays' | 'aimClick';

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

export interface RoundResultEntry {
  playerId: string;
  name: string;
  color: string;
  roundScore: number;
  totalScore: number;
}

export interface SessionResultEntry {
  playerId: string;
  name: string;
  color: string;
  totalScore: number;
}

export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; roomCode: string; name: string }
  | { type: 'ping'; t0: number }
  | { type: 'start_session' }
  | { type: 'round_live_score'; score: number }
  | { type: 'round_score'; score: number }
  | { type: 'simon_guess'; sequence: number[] }
  | { type: 'leave_room' };

export type ServerMessage =
  | { type: 'room_created'; roomCode: string }
  | { type: 'room_joined'; roomCode: string; playerId: string; color: string }
  | { type: 'player_list'; players: PlayerInfo[] }
  | { type: 'pong'; t0: number; serverTime: number }
  | {
      type: 'round_starting';
      gameId: GameId;
      roundIndex: number;
      totalRounds: number;
      startAnchorServerTime: number;
      /** simonSays 라운드에서만, 호스트에게만 실려온다 */
      simonSequence?: number[];
    }
  | { type: 'round_live_update'; playerId: string; score: number }
  | { type: 'round_result'; entries: RoundResultEntry[] }
  | { type: 'session_finished'; entries: SessionResultEntry[] }
  | { type: 'room_closed'; reason: string }
  | { type: 'error'; message: string };
