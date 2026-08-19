import type { Chart, ChartNote, EngineCallbacks, EngineStats, Judgement, JudgementEvent } from './types';
import {
  BONUS_MULTIPLIER,
  COMBO_BANNER_DURATION_SEC,
  COMBO_MILESTONE_STEP,
  HIT_WINDOWS_MS,
  PARTICLE_COUNT,
  PARTICLE_LIFE_SEC,
  PUNCH_DURATION_SEC,
  RING_LEAD_SEC,
  RING_MAX_RADIUS,
  SCORE_TABLE,
  SHAKE_DURATION_SEC,
  SHAKE_MAGNITUDE_PX,
  TARGET_RADIUS,
} from './constants';

interface ActiveNote extends ChartNote {
  judged: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

function judgementColor(judgement: Judgement): string {
  switch (judgement) {
    case 'perfect':
      return '#ffd15d';
    case 'great':
      return '#5dd6ff';
    case 'good':
      return '#8bff5d';
    default:
      return '#ff5d8f';
  }
}

/**
 * 플레이어 자신의 기기(폰/PC)에서 도는 태핑 판정 엔진. Canvas 2D + requestAnimationFrame으로
 * 동작하며 React state와는 완전히 분리되어 있다. 노트 이동은 없고, 화면 중앙 링이 목표
 * 크기로 줄어드는 공유 신호에 맞춰 탭하면 판정된다.
 *
 * 타이밍의 기준 시계는 이 기기의 AudioContext.currentTime이 아니라, 서버와 동기화된
 * songTime을 돌려주는 getSongTime 콜백이다 — 그래야 서로 다른 기기에서도 같은 신호를
 * 같은 순간에 보게 된다. (실제 음악 재생은 호스트 기기에서만 Web Audio로 이뤄진다.)
 */
export class PlayerEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly getSongTime: () => number;
  private readonly callbacks: EngineCallbacks;
  private readonly notes: ActiveNote[];
  private readonly duration: number;

  private rafId: number | null = null;
  private running = false;
  private currentIndex = 0;
  private lastFrameMs: number | null = null;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private counts: Record<Judgement, number> = { perfect: 0, great: 0, good: 0, miss: 0 };

  private particles: Particle[] = [];
  private punchAt: number | null = null;
  private flashColor: string | null = null;
  private shakeAt: number | null = null;
  private comboBannerAt: number | null = null;
  private comboBannerText = '';

  constructor(
    canvas: HTMLCanvasElement,
    chart: Chart,
    getSongTime: () => number,
    callbacks: EngineCallbacks = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context를 가져올 수 없습니다.');

    this.canvas = canvas;
    this.ctx = ctx;
    this.getSongTime = getSongTime;
    this.callbacks = callbacks;
    this.notes = [...chart.notes]
      .sort((a, b) => a.time - b.time)
      .map((note) => ({ ...note, judged: false }));
    const lastNoteTime = this.notes.length ? this.notes[this.notes.length - 1].time : 0;
    this.duration = lastNoteTime + 2;
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

  /** 화면 탭/클릭/스페이스 입력 시 호출. 판정 로직은 오직 이 엔진 내부에서만 수행한다. */
  tap() {
    if (!this.running) return;

    const note = this.notes[this.currentIndex];
    if (!note || note.judged) return;

    const songTime = this.getSongTime();
    const deltaMs = (songTime - note.time) * 1000;
    if (Math.abs(deltaMs) > HIT_WINDOWS_MS.good) return;

    const judgement = this.judgeDelta(Math.abs(deltaMs));
    note.judged = true;
    this.applyJudgement(judgement, deltaMs, note.lane === 1);

    this.punchAt = performance.now();
    this.flashColor = judgementColor(judgement);
    this.spawnParticles(judgement);
  }

  private judgeDelta(absDeltaMs: number): Judgement {
    if (absDeltaMs <= HIT_WINDOWS_MS.perfect) return 'perfect';
    if (absDeltaMs <= HIT_WINDOWS_MS.great) return 'great';
    return 'good';
  }

  private applyJudgement(judgement: Judgement, deltaMs: number, isBonus: boolean) {
    if (judgement === 'miss') {
      this.combo = 0;
      this.shakeAt = performance.now();
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (this.combo > 0 && this.combo % COMBO_MILESTONE_STEP === 0) {
        this.comboBannerAt = performance.now();
        this.comboBannerText = `${this.combo} COMBO!`;
      }
    }
    this.counts[judgement] += 1;
    const base = SCORE_TABLE[judgement];
    this.score += isBonus ? base * BONUS_MULTIPLIER : base;

    const event: JudgementEvent = { judgement, delta: deltaMs, combo: this.combo, score: this.score };
    this.callbacks.onJudgement?.(event);
  }

  private advanceAndAutoMiss(songTime: number) {
    while (this.currentIndex < this.notes.length) {
      const note = this.notes[this.currentIndex];
      const windowEndSec = note.time + HIT_WINDOWS_MS.good / 1000;
      if (songTime <= windowEndSec) break;

      if (!note.judged) {
        note.judged = true;
        this.applyJudgement('miss', (songTime - note.time) * 1000, note.lane === 1);
      }
      this.currentIndex += 1;
    }
  }

  private spawnParticles(judgement: Judgement) {
    if (judgement === 'miss') return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.42;
    const color = judgementColor(judgement);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const speed = 140 + Math.random() * 140;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE_SEC,
        color,
      });
    }
  }

  private updateParticles(dt: number) {
    if (this.particles.length === 0) return;
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private loop = () => {
    if (!this.running) return;

    const nowMs = performance.now();
    const dt = this.lastFrameMs === null ? 0 : (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;

    const songTime = this.getSongTime();
    this.advanceAndAutoMiss(songTime);
    this.updateParticles(dt);
    this.render(songTime, nowMs);
    this.callbacks.onProgress?.(songTime, this.duration);

    if (songTime >= this.duration) {
      this.finish();
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private finish() {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    const stats: EngineStats = {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      counts: { ...this.counts },
    };
    this.callbacks.onFinish?.(stats);
  }

  private render(songTime: number, nowMs: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h * 0.42;

    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const [shakeX, shakeY] = this.getShakeOffset(nowMs);
    ctx.translate(shakeX, shakeY);

    this.drawRing(cx, cy, songTime);
    this.drawParticles();
    this.drawTapZone(w, h, nowMs);
    this.drawComboBanner(cx, cy, nowMs);

    ctx.restore();
  }

  private getShakeOffset(nowMs: number): [number, number] {
    if (this.shakeAt === null) return [0, 0];
    const elapsed = (nowMs - this.shakeAt) / 1000;
    if (elapsed >= SHAKE_DURATION_SEC) {
      this.shakeAt = null;
      return [0, 0];
    }
    const decay = 1 - elapsed / SHAKE_DURATION_SEC;
    const angle = elapsed * 60;
    return [Math.cos(angle) * SHAKE_MAGNITUDE_PX * decay, Math.sin(angle * 1.3) * SHAKE_MAGNITUDE_PX * decay];
  }

  private drawComboBanner(cx: number, cy: number, nowMs: number) {
    if (this.comboBannerAt === null) return;
    const elapsed = (nowMs - this.comboBannerAt) / 1000;
    if (elapsed >= COMBO_BANNER_DURATION_SEC) {
      this.comboBannerAt = null;
      return;
    }

    const { ctx } = this;
    const t = elapsed / COMBO_BANNER_DURATION_SEC;
    const scale = 1.4 - t * 0.4;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffd15d';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.comboBannerText, 0, 0);
    ctx.restore();
  }

  private drawRing(cx: number, cy: number, songTime: number) {
    const { ctx } = this;

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

  private drawParticles() {
    const { ctx } = this;
    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / PARTICLE_LIFE_SEC);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawTapZone(w: number, h: number, nowMs: number) {
    const { ctx } = this;
    const x = w / 2;
    const y = h * 0.82;

    let scale = 1;
    let ringAlpha = 0;
    if (this.punchAt !== null) {
      const elapsed = (nowMs - this.punchAt) / 1000;
      if (elapsed < PUNCH_DURATION_SEC) {
        const t = elapsed / PUNCH_DURATION_SEC;
        scale = 1 + (1 - t) * 0.4;
        ringAlpha = 1 - t;
      } else {
        this.punchAt = null;
      }
    }

    if (ringAlpha > 0 && this.flashColor) {
      ctx.beginPath();
      ctx.strokeStyle = this.flashColor;
      ctx.globalAlpha = ringAlpha;
      ctx.lineWidth = 4;
      ctx.arc(x, y, 44 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.arc(x, y, 36 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAP', x, y);
  }
}
