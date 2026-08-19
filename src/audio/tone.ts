/**
 * 각 기기에서 즉시 재생되는 짧은 피드백 톤. 방 전체와 동기화할 필요가 없는
 * 즉석 반응 사운드(탭, 히트, 정답/오답 등)에 사용한다.
 */
export function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec = 0.15,
  type: OscillatorType = 'sine',
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}
