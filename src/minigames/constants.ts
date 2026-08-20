import type { Judgement } from '../net/protocol';

/** 라운드 시작 신호(round_starting)가 온 뒤, 실제 액션이 시작되기까지 대기 시간. 서버 상수와 반드시 맞춰야 한다. */
export const ROUND_LEAD_MS = 3000;

/** 판정 등급별 허용 오차 (ms, 절대값). 서버 상수와 반드시 맞춰야 한다. */
export const HIT_WINDOWS_MS = {
  perfect: 45,
  great: 90,
  good: 140,
} as const;

export function judgeFromAbsDeltaMs(absDeltaMs: number): Judgement {
  if (absDeltaMs <= HIT_WINDOWS_MS.perfect) return 'perfect';
  if (absDeltaMs <= HIT_WINDOWS_MS.great) return 'great';
  if (absDeltaMs <= HIT_WINDOWS_MS.good) return 'good';
  return 'miss';
}

export const JUDGEMENT_COLOR: Record<Judgement, string> = {
  perfect: '#ffd15d',
  great: '#5dd6ff',
  good: '#8bff5d',
  miss: '#ff5d8f',
};

/** 타이밍 릴레이: 참가자 한 명의 턴에 배정된 시간 (ms). 서버 상수와 반드시 맞춰야 한다. */
export const TURN_DURATION_MS = 2000;
/** 턴 시작 후 링이 목표 크기까지 줄어드는 데 걸리는 시간(=판정 타이밍) */
export const TURN_RING_LEAD_MS = 1200;
export const RELAY_SCORE_TABLE: Record<Judgement, number> = {
  perfect: 1000,
  great: 700,
  good: 300,
  miss: 0,
};

/** 다같이 완성하기: 박자 수 / 박자 간격 (ms). 서버 상수와 반드시 맞춰야 한다. */
export const BEAT_COUNT = 6;
export const BEAT_INTERVAL_MS = 1200;
/** 라운드마다 박자 간격이 달라져서 단순 암기를 막는다. */
export const SYNC_BEAT_PATTERNS = [
  [1050, 850, 1050, 700, 1050, 850],
  [900, 900, 650, 900, 750, 650, 900],
  [800, 620, 1000, 620, 800, 620, 1000, 620],
] as const;

export function getSyncBeatPattern(roundIndex: number): number[] {
  return [...SYNC_BEAT_PATTERNS[roundIndex % SYNC_BEAT_PATTERNS.length]];
}

const SYNC_TARGET_PATTERNS = [
  [0, 1, 2, 1, 0, 2],
  [1, 2, 0, 2, 1, 0, 2],
  [2, 0, 1, 2, 0, 1, 2, 1],
] as const;

export function getSyncBeatTargets(roundIndex: number, beatCount: number): number[] {
  const pattern = SYNC_TARGET_PATTERNS[roundIndex % SYNC_TARGET_PATTERNS.length];
  return Array.from({ length: beatCount }, (_, index) => pattern[index % pattern.length]);
}

export const SYNC_SCORE_TABLE: Record<Judgement, number> = {
  perfect: 150,
  great: 100,
  good: 40,
  miss: 0,
};

export const COIN_RUSH_DURATION_MS = 8000;
export const COIN_RUSH_SCORE_PER_COIN = 50;
export const COIN_RUSH_TARGET_INTERVAL_MS = 360;
export const COIN_RUSH_HIT_WINDOW_MS = 155;
export const COIN_RUSH_COMBO_BONUS = 15;
export const COIN_LANE_INTERVAL_MS = 620;
export const COIN_LANE_HIT_WINDOW_MS = 245;
export const COIN_LANE_PATTERN = [0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0, 2] as const;
