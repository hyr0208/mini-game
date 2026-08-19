import type { Chart, ChartNote } from './types';
import { HIT_WINDOWS_MS, RING_LEAD_SEC, RING_MAX_RADIUS, TARGET_RADIUS } from './constants';

/**
 * 호스트(다같이 보는 공유 화면)에서 도는 신호 시각화 전용 엔진. 입력이나 판정은
 * 전혀 하지 않고, 모든 플레이어 기기와 동일한 링을 songTime에 맞춰 그리기만 한다.
 * 점수/콤보는 각 플레이어 기기에서 개별적으로 계산돼 서버를 거쳐 별도로 전달된다.
 */
export class CueEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly getSongTime: () => number;
  private readonly notes: ChartNote[];
  private readonly duration: number;
  private readonly onFinish?: () => void;

  private rafId: number | null = null;
  private running = false;
  private currentIndex = 0;

  constructor(canvas: HTMLCanvasElement, chart: Chart, getSongTime: () => number, onFinish?: () => void) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context를 가져올 수 없습니다.');

    this.canvas = canvas;
    this.ctx = ctx;
    this.getSongTime = getSongTime;
    this.notes = [...chart.notes].sort((a, b) => a.time - b.time);
    const lastNoteTime = this.notes.length ? this.notes[this.notes.length - 1].time : 0;
    this.duration = lastNoteTime + 2;
    this.onFinish = onFinish;
  }

  start() {
    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy() {
    this.stop();
  }

  private loop = () => {
    if (!this.running) return;

    const songTime = this.getSongTime();
    while (
      this.currentIndex < this.notes.length &&
      songTime > this.notes[this.currentIndex].time + HIT_WINDOWS_MS.good / 1000
    ) {
      this.currentIndex += 1;
    }

    this.render(songTime);

    if (songTime >= this.duration) {
      this.stop();
      this.onFinish?.();
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(songTime: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.arc(cx, cy, TARGET_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    const note = this.notes[this.currentIndex];
    if (!note) return;

    const isBonus = note.lane === 1;
    const appearAt = note.time - RING_LEAD_SEC;
    if (songTime < appearAt) return;

    const t = Math.min(1, Math.max(0, (songTime - appearAt) / RING_LEAD_SEC));
    const radius = RING_MAX_RADIUS - t * (RING_MAX_RADIUS - TARGET_RADIUS);

    ctx.beginPath();
    ctx.strokeStyle = isBonus ? 'rgba(255,209,93,0.9)' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = isBonus ? 7 : 5;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}
