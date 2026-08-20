/**
 * 미니게임 참가자 화면이 점수를 보고하는 데 필요한 최소 인터페이스.
 * RoomClient(네트워크 멀티플레이)와 LocalClient(혼자하기, 서버 없이 로컬)가
 * 둘 다 이 모양을 만족하므로, 참가자 화면 컴포넌트는 어느 쪽이 오든 그대로 재사용된다.
 */
export interface ScoreReporter {
  now(): number;
  reportLiveScore(score: number): void;
  reportRoundScore(score: number): void;
}
