import type { ScoreReporter } from './ScoreReporter';

/**
 * 혼자하기(서버 없음)에서 쓰는 ScoreReporter 구현체. 참가자 화면 컴포넌트는
 * RoomClient든 이 클래스든 구분하지 않고 그대로 재사용한다.
 */
export class LocalClient implements ScoreReporter {
  onScore?: (score: number) => void;

  now(): number {
    return Date.now();
  }

  reportLiveScore(_score: number) {
    // 혼자하기에는 실시간 랭킹 표시가 없어 현재는 사용하지 않는다.
  }

  reportRoundScore(score: number) {
    this.onScore?.(score);
  }
}
