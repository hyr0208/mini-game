import type { Chart } from '../engine/types';

/**
 * Web Audio API 재생/타이밍 담당. GameEngine은 이 클래스가 감싸는
 * AudioContext.currentTime을 유일한 시계로 사용해 노트 위치와 판정을 계산한다.
 */
export class AudioEngine {
  readonly context: AudioContext;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  constructor() {
    this.context = new AudioContext();
  }

  /** 브라우저 자동재생 정책 때문에 사용자 제스처(클릭 등) 안에서 호출해야 한다. */
  async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadFromUrl(url: string) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
  }

  /**
   * 실제 음원 파일이 없을 때, 데모용 오디오 버퍼를 절차적으로 생성한다.
   * chart.audioSrc가 없는 곡에서 사용하며, 두 겹으로 구성된다:
   *  - 매 박자마다 은은한 메트로놈 틱 (신호 사이 정적을 없애 리듬감을 준다)
   *  - 실제 신호(note) 타이밍에는 더 크고 또렷한 톤 (기본/보너스로 음높이 구분)
   */
  generateClickTrack(chart: Chart, durationSec: number) {
    const sampleRate = this.context.sampleRate;
    const length = Math.max(1, Math.ceil(durationSec * sampleRate));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const addClick = (time: number, frequency: number, amplitude: number, clickSec: number) => {
      const startSample = Math.floor(time * sampleRate);
      const clickSamples = Math.floor(clickSec * sampleRate);
      for (let i = 0; i < clickSamples; i++) {
        const idx = startSample + i;
        if (idx < 0 || idx >= length) continue;
        const envelope = 1 - i / clickSamples;
        const tone = Math.sin((i / sampleRate) * frequency * Math.PI * 2);
        data[idx] += tone * envelope * amplitude;
      }
    };

    const beatSec = 60 / chart.bpm;
    const beatCount = Math.floor(durationSec / beatSec);
    for (let b = 0; b <= beatCount; b++) {
      addClick(b * beatSec, 900, 0.08, 0.03);
    }

    for (const note of chart.notes) {
      // 보너스 신호(lane === 1)는 더 높고 화려한 톤으로 구분한다.
      const frequency = note.lane === 1 ? 1400 : 700;
      addClick(note.time, frequency, 0.5, 0.05);
    }

    this.buffer = buffer;
  }

  /**
   * startDelaySec 뒤에 재생을 예약하고, 그 시작 시각(AudioContext.currentTime 기준)을
   * 반환한다. GameEngine.start()에는 반드시 이 반환값을 그대로 넘겨야 화면과 오디오가
   * 동기화된다.
   */
  play(startDelaySec = 0.5): number {
    if (!this.buffer) {
      throw new Error('오디오 버퍼가 준비되지 않았습니다. loadFromUrl 또는 generateClickTrack을 먼저 호출하세요.');
    }

    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.context.destination);

    const startAt = this.context.currentTime + startDelaySec;
    source.start(startAt);
    this.source = source;
    return startAt;
  }

  stop() {
    try {
      this.source?.stop();
    } catch {
      // 이미 재생이 끝났거나 시작 전인 경우 무시
    }
    this.source = null;
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }
}
