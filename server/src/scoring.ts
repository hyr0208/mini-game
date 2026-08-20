export type Judgement = 'perfect' | 'great' | 'good' | 'miss';

/** 각 판정 등급의 허용 오차 (ms, 절대값). 클라이언트 상수와 반드시 맞춰야 한다. */
export const HIT_WINDOWS_MS = {
  perfect: 45,
  great: 90,
  good: 140,
} as const;

export const RELAY_SCORE_TABLE: Record<Judgement, number> = {
  perfect: 1000,
  great: 700,
  good: 300,
  miss: 0,
};

export const SYNC_SCORE_TABLE: Record<Judgement, number> = {
  perfect: 150,
  great: 100,
  good: 40,
  miss: 0,
};

export const SYNC_BEAT_PATTERNS = [
  [1050, 850, 1050, 700, 1050, 850],
  [900, 900, 650, 900, 750, 650, 900],
  [800, 620, 1000, 620, 800, 620, 1000, 620],
] as const;

export const SYNC_TARGET_PATTERNS = [
  [0, 1, 2, 1, 0, 2],
  [1, 2, 0, 2, 1, 0, 2],
  [2, 0, 1, 2, 0, 1, 2, 1],
] as const;

export const COIN_RUSH_DURATION_MS = 8000;
export const COIN_RUSH_SCORE_PER_COIN = 50;

export function judgeFromAbsDeltaMs(absDeltaMs: number): Judgement {
  if (absDeltaMs <= HIT_WINDOWS_MS.perfect) return 'perfect';
  if (absDeltaMs <= HIT_WINDOWS_MS.great) return 'great';
  if (absDeltaMs <= HIT_WINDOWS_MS.good) return 'good';
  return 'miss';
}
