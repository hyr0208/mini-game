import type { Judgement } from '../engine/types';

const TONE_HZ: Record<Judgement, number> = {
  perfect: 1046.5, // C6 — 가장 맑고 높은 타격음
  great: 830.6, // Ab5
  good: 587.3, // D5
  miss: 110, // 낮고 둔한 버즈
};

/**
 * 탭 즉시 재생되는 효과음. 호스트가 재생하는 곡과는 무관하게 각 기기가 독립적으로,
 * 네트워크 동기화 없이 바로 소리를 낸다 — 판정 자체가 이미 동기화된 songTime 기준으로
 * 계산됐으므로, 그 결과에 대한 피드백 사운드는 즉시 로컬에서 울려도 문제없다.
 */
export class SfxPlayer {
  private readonly ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  play(judgement: Judgement) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = judgement === 'miss' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(TONE_HZ[judgement], now);
    if (judgement === 'perfect') {
      // 퍼펙트만 살짝 위로 튕기는 핏치로 쾌감을 더한다
      osc.frequency.exponentialRampToValueAtTime(TONE_HZ[judgement] * 1.4, now + 0.09);
    }

    const peak = judgement === 'miss' ? 0.18 : 0.3;
    const duration = judgement === 'miss' ? 0.22 : 0.16;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
