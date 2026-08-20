/**
 * 클라이언트(rhythm-game/src/net/protocol.ts)와 반드시 동일하게 맞춰야 하는
 * WebSocket 메시지 타입 정의. 별도 패키지라 공유 임포트 대신 수동으로 복제해서 관리한다.
 */
import type { Judgement } from './scoring.js';

export type GameId = 'timingRelay' | 'syncBuild' | 'coinRush';

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

/** 타이밍 릴레이: 참가자별 턴 순서 + 봇의 결과(호스트 화면 연출용, 참가자에게는 보내지 않는다) */
export interface TurnPlanEntry {
  participantId: string;
  name: string;
  color: string;
  isBot: boolean;
  turnStartOffsetMs: number;
  botResult?: { judgement: Judgement; deltaMs: number };
}

/** 다같이 완성하기: 봇 참가자별 박자당 결과 (호스트 화면 연출용) */
export interface BeatPlanEntry {
  participantId: string;
  name: string;
  color: string;
  perBeatJudgement: Judgement[];
}

export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join_room'; roomCode: string; name: string }
  | { type: 'ping'; t0: number }
  | { type: 'start_session' }
  | { type: 'round_live_score'; score: number }
  | { type: 'round_score'; score: number }
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
      /** timingRelay: 호스트에게만 실려오는 전체 턴 계획 */
      turnPlan?: TurnPlanEntry[];
      /** timingRelay: 각 참가자에게만 실려오는 "내 턴" 시작 오프셋(ms) */
      myTurnOffsetMs?: number;
      /** syncBuild: 전원에게 공통으로 실려오는 박자 스케줄 */
      beatCount?: number;
      beatIntervalMs?: number;
      beatIntervalsMs?: number[];
      beatTargets?: number[];
      /** syncBuild: 호스트에게만 실려오는 봇들의 박자별 결과 */
      beatPlan?: BeatPlanEntry[];
    }
  | { type: 'round_live_update'; playerId: string; score: number }
  | { type: 'round_result'; entries: RoundResultEntry[] }
  | { type: 'session_finished'; entries: SessionResultEntry[] }
  | { type: 'room_closed'; reason: string }
  | { type: 'error'; message: string };
