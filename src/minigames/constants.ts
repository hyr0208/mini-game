/** 라운드 시작 신호(round_starting)가 온 뒤, 실제 액션이 시작되기까지 대기 시간. 서버 상수와 반드시 맞춰야 한다. */
export const ROUND_LEAD_MS = 3000;

/** 버튼 마쉬: 실제 마쉬 구간 시간 (ms) */
export const BUTTON_MASH_DURATION_MS = 5000;
export const BUTTON_MASH_SCORE_PER_TAP = 50;

/** 순서 암기: 한 스텝(깜빡임+간격) 길이, 시퀀스 길이, 입력 제한 시간 (ms) */
export const SIMON_STEP_MS = 700;
export const SIMON_SEQUENCE_LENGTH = 5;
export const SIMON_INPUT_TIMEOUT_MS = 8000;
export const SIMON_SCORE_PER_CORRECT_STEP = 200;
export const SIMON_COLORS = ['#ff5d8f', '#5dd6ff', '#ffd15d', '#8bff5d'];

/** 조준 클릭: 진행 시간, 타겟 반지름/점수 (ms, px) */
export const AIM_DURATION_MS = 8000;
export const AIM_TARGET_RADIUS = 34;
export const AIM_SCORE_PER_HIT = 150;
