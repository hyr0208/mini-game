/**
 * 클라이언트(rhythm-game/src/net/protocol.ts)와 반드시 동일하게 맞춰야 하는
 * WebSocket 메시지 타입 정의. 별도 패키지라 공유 임포트 대신 수동으로 복제해서 관리한다.
 */

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

export interface PlayerResult {
  id: string;
  name: string;
  color: string;
  score: number;
  maxCombo: number;
}

export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; roomCode: string; name: string }
  | { type: 'ping'; t0: number }
  | { type: 'select_song'; chartId: string }
  | { type: 'start_game'; startAnchorServerTime: number }
  | { type: 'player_update'; score: number; combo: number }
  | { type: 'player_finished'; score: number; maxCombo: number }
  | { type: 'leave_room' };

export type ServerMessage =
  | { type: 'room_created'; roomCode: string }
  | { type: 'room_joined'; roomCode: string; playerId: string; color: string }
  | { type: 'player_list'; players: PlayerInfo[] }
  | { type: 'pong'; t0: number; serverTime: number }
  | { type: 'song_selected'; chartId: string }
  | { type: 'game_starting'; chartId: string; startAnchorServerTime: number }
  | { type: 'player_update'; playerId: string; score: number; combo: number }
  | { type: 'game_finished'; results: PlayerResult[] }
  | { type: 'room_closed'; reason: string }
  | { type: 'error'; message: string };
