export type Judgement = 'perfect' | 'great' | 'good' | 'miss';

/** 태고식 2체계 입력: 돈(빨강, 가운데) / 카(파랑, 테두리) */
export type NoteInput = 'don' | 'ka';

/**
 * 채보 노트 하나. time은 곡 시작(0초) 기준 초 단위.
 * lane은 노트 종류를 나타낸다: 0=돈, 1=카, 2=큰돈, 3=큰카.
 */
export interface ChartNote {
  time: number;
  lane: number;
}

export interface Chart {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** public/ 기준 음원 경로. 생략 시 노트 타이밍으로 클릭 트랙을 절차적으로 생성해 재생한다. */
  audioSrc?: string;
  /** 채보와 음원 사이의 보정값(초). 음원 인트로 무음 등을 보정할 때 사용. */
  offset?: number;
  notes: ChartNote[];
}

export interface JudgementEvent {
  judgement: Judgement;
  input: NoteInput;
  /** 판정 시점과 노트 타이밍의 차이(ms). 음수면 빠르게, 양수면 늦게 입력한 것. */
  delta: number;
  combo: number;
  score: number;
}

export interface EngineStats {
  score: number;
  combo: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
}

export interface GameEngineCallbacks {
  onJudgement?: (event: JudgementEvent) => void;
  onComboChange?: (combo: number, maxCombo: number) => void;
  onScoreChange?: (score: number) => void;
  onProgress?: (songTime: number, duration: number) => void;
  onFinish?: (stats: EngineStats) => void;
}
