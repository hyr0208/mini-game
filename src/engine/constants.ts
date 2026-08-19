import type { Judgement } from './types';

/** 각 판정 등급의 허용 오차 (ms, 절대값) */
export const HIT_WINDOWS_MS = {
  perfect: 45,
  great: 90,
  good: 140,
} as const;

export const SCORE_TABLE: Record<Judgement, number> = {
  perfect: 1000,
  great: 700,
  good: 300,
  miss: 0,
};

/** 보너스 신호(lane === 1)의 점수 배율 */
export const BONUS_MULTIPLIER = 2;

/** 신호가 수렴해야 하는 목표 링의 반지름 (px) */
export const TARGET_RADIUS = 60;
/** 바깥쪽 링이 목표 크기까지 줄어드는 데 걸리는 시간 (초) — 신호가 미리 보이기 시작하는 시점 */
export const RING_LEAD_SEC = 1.1;
export const RING_MAX_RADIUS = 220;

/** 입력 시 튀어오르는 펀치 이펙트 길이 (초) */
export const PUNCH_DURATION_SEC = 0.22;
export const PARTICLE_LIFE_SEC = 0.4;
export const PARTICLE_COUNT = 14;

/** 각 플레이어 기기가 서버에 접속할 WebSocket 주소 */
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${typeof location !== 'undefined' ? location.hostname : 'localhost'}:8787`;

/** 호스트가 신호 시작 시각을 서버 기준 시각으로 예약할 때, 얼마나 여유를 두고 예약할지 (ms) */
export const START_LEAD_MS = 3000;
