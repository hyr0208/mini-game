import { randomUUID } from 'node:crypto';

/** 닌텐도 캐릭터를 연상시키지 않는 오리지널 봇 이름/색상 */
const BOT_NAMES = ['루키', '차분이', '스피디', '뭉치'];
const BOT_COLOR_POOL = ['#ff5d8f', '#5dd6ff', '#ffd15d', '#8bff5d'];

export interface BotParticipant {
  id: string;
  name: string;
  color: string;
  /** 0~1, 높을수록 타이밍이 정확함 */
  skill: number;
  totalScore: number;
}

export function createBots(count: number, usedColors: ReadonlySet<string>): BotParticipant[] {
  const availableColors = BOT_COLOR_POOL.filter((color) => !usedColors.has(color));
  const bots: BotParticipant[] = [];

  for (let i = 0; i < count; i++) {
    bots.push({
      id: `bot-${randomUUID()}`,
      name: BOT_NAMES[i % BOT_NAMES.length],
      color: availableColors[i] ?? BOT_COLOR_POOL[i % BOT_COLOR_POOL.length],
      skill: 0.5 + Math.random() * 0.4,
      totalScore: 0,
    });
  }
  return bots;
}

/** 박스뮬러 근사로 정규분포에 가까운 난수를 만든다 (평균 0). */
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2);
}

/** 스킬 기반 타이밍 오차(ms)를 생성한다. 스킬이 높을수록 0(완벽한 타이밍)에 가깝다. */
export function simulateBotDeltaMs(skill: number): number {
  const spread = (1 - skill) * 220;
  return gaussianRandom() * spread * 0.5;
}
