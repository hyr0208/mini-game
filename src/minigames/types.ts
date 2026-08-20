export type GameId = 'timingRelay' | 'syncBuild' | 'coinRush';

export const GAME_LABEL: Record<GameId, string> = {
  timingRelay: '타이밍 릴레이',
  syncBuild: '다같이 완성하기',
  coinRush: '코인 러시',
};

export const GAME_DESC: Record<GameId, string> = {
  timingRelay: '순서대로 한 명씩, 내 차례에 딱 맞춰 누르세요',
  syncBuild: '다같이 같은 박자에 맞춰 눌러서 함께 완성하세요',
  coinRush: '제한 시간 안에 누구보다 빠르게 코인을 모으세요',
};

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
