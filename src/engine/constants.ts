import type { Judgement, NoteInput } from './types';

/** 노트가 판정존을 향해 이동하는 속도 (px/sec) */
export const NOTE_SPEED_PX_PER_SEC = 480;

/** 판정존의 가로 위치 (캔버스 너비 대비 비율, 오른쪽에 위치) */
export const HIT_X_RATIO = 0.82;

/** 각 판정 등급의 허용 오차 (ms, 절대값) */
export const HIT_WINDOWS_MS = {
  perfect: 40,
  great: 80,
  good: 120,
} as const;

export const NOTE_RADIUS = { small: 26, big: 38 } as const;

export const DON_COLOR = '#ef4444';
export const KA_COLOR = '#38bdf8';

/** 키보드 D/F/J/K를 돈/카 두 입력 그룹으로 매핑 (실제 태고 컨트롤러의 좌우 대칭 배치를 따름) */
export const KEY_TO_INPUT: Record<string, NoteInput> = {
  f: 'don',
  j: 'don',
  d: 'ka',
  k: 'ka',
};

export const SCORE_TABLE: Record<Judgement, number> = {
  perfect: 1000,
  great: 700,
  good: 300,
  miss: 0,
};

export const BIG_NOTE_SCORE_MULTIPLIER = 2;

/** 판정존 펀치/파티클 이펙트가 사라지는 데 걸리는 시간 (초) */
export const PUNCH_DURATION_SEC = 0.18;
export const PARTICLE_LIFE_SEC = 0.4;
export const PARTICLE_COUNT = 14;
