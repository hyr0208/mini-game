export type GameId = 'buttonMash' | 'simonSays' | 'aimClick';

export const GAME_LABEL: Record<GameId, string> = {
  buttonMash: '버튼 마쉬',
  simonSays: '순서 암기',
  aimClick: '조준 클릭',
};

export const GAME_DESC: Record<GameId, string> = {
  buttonMash: '신호가 뜨면 최대한 빨리, 최대한 많이 탭하세요',
  simonSays: '화면에 뜨는 순서를 잘 보고 그대로 따라 누르세요',
  aimClick: '나타나는 타겟을 최대한 정확하게 클릭하세요',
};

export interface RoundStartData {
  gameId: GameId;
  roundIndex: number;
  totalRounds: number;
  startAnchorServerTime: number;
  /** simonSays 라운드에서만, 호스트에게만 전달되는 정답 시퀀스 */
  simonSequence?: number[];
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
