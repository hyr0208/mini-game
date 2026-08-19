export type Judgement = 'perfect' | 'great' | 'good' | 'miss';

/**
 * 채보 노트 하나. time은 곡 시작(0초) 기준 초 단위, 모든 플레이어가 공유하는
 * 신호 발생 시각이다. lane은 신호 종류: 0=기본 신호, 1=보너스 신호(점수 2배).
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
  /** 판정 시점과 신호 타이밍의 차이(ms). 음수면 빠르게, 양수면 늦게 입력한 것. */
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

export interface EngineCallbacks {
  onJudgement?: (event: JudgementEvent) => void;
  onProgress?: (songTime: number, duration: number) => void;
  onFinish?: (stats: EngineStats) => void;
}
