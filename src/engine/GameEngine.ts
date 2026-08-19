import type {
  Chart,
  ChartNote,
  EngineStats,
  GameEngineCallbacks,
  Judgement,
  NoteInput,
  JudgementEvent,
} from './types';
import {
  BIG_NOTE_SCORE_MULTIPLIER,
  DON_COLOR,
  HIT_X_RATIO,
  HIT_WINDOWS_MS,
  KA_COLOR,
  NOTE_RADIUS,
  NOTE_SPEED_PX_PER_SEC,
  PARTICLE_COUNT,
  PARTICLE_LIFE_SEC,
  PUNCH_DURATION_SEC,
  SCORE_TABLE,
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

function noteInput(lane: number): NoteInput {
  return lane % 2 === 0 ? 'don' : 'ka';
}

function noteIsBig(lane: number): boolean {
  return lane >= 2;
}

/**
 * 태고 스타일 리듬게임 엔진. Canvas 2D + requestAnimationFrame으로 동작하며
 * React state와는 완전히 분리되어 있다: 노트 이동/렌더링/판정/이펙트는 모두
 * 이 클래스 내부에서 처리하고, 점수·콤보·판정 결과가 바뀔 때만 콜백으로 알린다.
 * 타이밍의 유일한 기준 시계는 AudioContext.currentTime이다.
 */
export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly audioCtx: AudioContext;
  private readonly callbacks: GameEngineCallbacks;
  private readonly offset: number;
  private readonly bpm: number;
  private readonly notes: ActiveNote[];
  private readonly duration: number;

  private rafId: number | null = null;
  private running = false;

  /** 곡 재생 시작 시각과 대응하는 AudioContext.currentTime 값 */
  private audioStartCtxTime = 0;
  private lastCtxTime: number | null = null;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private counts: Record<Judgement, number> = {
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
  };

  private particles: Particle[] = [];
  private punchAt: Record<NoteInput, number | null> = { don: null, ka: null };

  constructor(
    canvas: HTMLCanvasElement,
    audioCtx: AudioContext,
    chart: Chart,
    callbacks: GameEngineCallbacks = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context를 가져올 수 없습니다.');

    this.canvas = canvas;
    this.ctx = ctx;
    this.audioCtx = audioCtx;
    this.callbacks = callbacks;
    this.offset = chart.offset ?? 0;
    this.bpm = chart.bpm;
    this.notes = [...chart.notes]
      .sort((a, b) => a.time - b.time)
      .map((note) => ({ ...note, judged: false }));
    const lastNoteTime = this.notes.length
      ? this.notes[this.notes.length - 1].time
      : 0;
    this.duration = lastNoteTime + 3;
  }

  /** audioStartCtxTime: 오디오 소스의 source.start()에 넘긴 것과 동일한 AudioContext 시각 */
  start(audioStartCtxTime: number) {
    this.audioStartCtxTime = audioStartCtxTime;
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

  /** 현재 곡 진행 시각(초). AudioContext.currentTime 기준으로 계산한다. */
  getSongTime(): number {
    return this.audioCtx.currentTime - this.audioStartCtxTime - this.offset;
  }

  /** 돈/카 입력이 들어왔을 때 호출. 판정 로직은 오직 이 엔진 내부에서만 수행한다. */
  hit(input: NoteInput) {
    if (!this.running) return;

    const nowCtx = this.audioCtx.currentTime;
    this.punchAt[input] = nowCtx;

    const songTime = this.getSongTime();
    const maxWindow = HIT_WINDOWS_MS.good;

    let target: ActiveNote | null = null;
    let bestAbsDelta = Infinity;

    for (const note of this.notes) {
      if (note.judged || noteInput(note.lane) !== input) continue;
      const deltaMs = (songTime - note.time) * 1000;
      if (Math.abs(deltaMs) > maxWindow) continue;
      if (Math.abs(deltaMs) < bestAbsDelta) {
        bestAbsDelta = Math.abs(deltaMs);
        target = note;
      }
    }

    if (!target) return;

    const deltaMs = (songTime - target.time) * 1000;
    const judgement = this.judgeDelta(Math.abs(deltaMs));
    target.judged = true;
    this.applyJudgement(judgement, input, deltaMs, noteIsBig(target.lane));
    this.spawnParticles(input, judgement);
  }

  private judgeDelta(absDeltaMs: number): Judgement {
    if (absDeltaMs <= HIT_WINDOWS_MS.perfect) return 'perfect';
    if (absDeltaMs <= HIT_WINDOWS_MS.great) return 'great';
    return 'good';
  }

  private applyJudgement(
    judgement: Judgement,
    input: NoteInput,
    deltaMs: number,
    isBig: boolean,
  ) {
    if (judgement === 'miss') {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    this.counts[judgement] += 1;
    const base = SCORE_TABLE[judgement];
    this.score += isBig ? base * BIG_NOTE_SCORE_MULTIPLIER : base;

    const event: JudgementEvent = {
      judgement,
      input,
      delta: deltaMs,
      combo: this.combo,
      score: this.score,
    };
    this.callbacks.onJudgement?.(event);
    this.callbacks.onComboChange?.(this.combo, this.maxCombo);
    this.callbacks.onScoreChange?.(this.score);
  }

  /** 판정 윈도우를 그냥 지나쳐버린 노트는 자동으로 miss 처리한다. */
  private autoMissPassedNotes(songTime: number) {
    for (const note of this.notes) {
      if (note.judged) continue;
      const deltaMs = (songTime - note.time) * 1000;
      if (deltaMs > HIT_WINDOWS_MS.good) {
        note.judged = true;
        this.applyJudgement('miss', noteInput(note.lane), deltaMs, noteIsBig(note.lane));
      }
    }
  }

  private spawnParticles(input: NoteInput, judgement: Judgement) {
    if (judgement === 'miss') return;

    const { canvas } = this;
    const hitX = canvas.width * HIT_X_RATIO;
    const hitY = canvas.height / 2;
    const color = input === 'don' ? DON_COLOR : KA_COLOR;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.4;
      const speed = 160 + Math.random() * 160;
      this.particles.push({
        x: hitX,
        y: hitY,
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

    const nowCtx = this.audioCtx.currentTime;
    const dt = this.lastCtxTime === null ? 0 : nowCtx - this.lastCtxTime;
    this.lastCtxTime = nowCtx;

    const songTime = nowCtx - this.audioStartCtxTime - this.offset;
    this.autoMissPassedNotes(songTime);
    this.updateParticles(dt);
    this.render(songTime);
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

  private render(songTime: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const trackY = h / 2;
    const hitX = w * HIT_X_RATIO;
    const nowCtx = this.audioCtx.currentTime;

    // 배경: BPM에 맞춰 은은하게 밝아졌다 어두워지는 펄스
    const beatPhase = ((songTime * this.bpm) / 60) % 1;
    const glow = Math.max(0, 1 - beatPhase) ** 3 * 0.08;
    ctx.fillStyle = `rgb(${11 + glow * 60}, ${11 + glow * 30}, ${20 + glow * 40})`;
    ctx.fillRect(0, 0, w, h);

    this.drawTrack(trackY, w, hitX);
    this.drawNotes(songTime, trackY, hitX);
    this.drawHitCircle(hitX, trackY, nowCtx);
    this.drawParticles();
  }

  private drawTrack(trackY: number, w: number, hitX: number) {
    const { ctx } = this;
    const trackHeight = 96;

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, trackY - trackHeight / 2, w, trackHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackY - trackHeight / 2);
    ctx.lineTo(w, trackY - trackHeight / 2);
    ctx.moveTo(0, trackY + trackHeight / 2);
    ctx.lineTo(w, trackY + trackHeight / 2);
    ctx.stroke();

    // 판정존 표시 링 (노트가 도착해야 하는 기준선)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(hitX, trackY, NOTE_RADIUS.big + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  private drawNotes(songTime: number, trackY: number, hitX: number) {
    const { ctx } = this;

    for (const note of this.notes) {
      if (note.judged) continue;

      const timeToHit = note.time - songTime;
      const x = hitX - timeToHit * NOTE_SPEED_PX_PER_SEC;
      const radius = noteIsBig(note.lane) ? NOTE_RADIUS.big : NOTE_RADIUS.small;
      if (x < -radius * 2 || x > this.canvas.width + radius * 2) continue;

      const color = noteInput(note.lane) === 'don' ? DON_COLOR : KA_COLOR;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, trackY, radius, 0, Math.PI * 2);
      ctx.fill();

      if (noteIsBig(note.lane)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, trackY, radius - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }

  private drawHitCircle(hitX: number, trackY: number, nowCtx: number) {
    const { ctx } = this;

    for (const input of ['don', 'ka'] as const) {
      const punchAt = this.punchAt[input];
      if (punchAt === null) continue;
      const elapsed = nowCtx - punchAt;
      if (elapsed > PUNCH_DURATION_SEC) {
        this.punchAt[input] = null;
        continue;
      }
      const t = elapsed / PUNCH_DURATION_SEC;
      const scale = 1 + (1 - t) * 0.5;
      const alpha = 1 - t;
      ctx.beginPath();
      ctx.strokeStyle = input === 'don'
        ? `rgba(239,68,68,${alpha})`
        : `rgba(56,189,248,${alpha})`;
      ctx.lineWidth = 6 * (1 - t) + 1;
      ctx.arc(hitX, trackY, (NOTE_RADIUS.big + 10) * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
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
}
