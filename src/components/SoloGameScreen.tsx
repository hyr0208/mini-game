import { useEffect, useRef, useState } from 'react';
import type { Chart, EngineStats, JudgementEvent } from '../engine/types';
import { PlayerEngine } from '../engine/PlayerEngine';
import { AudioEngine } from '../audio/AudioEngine';
import { SfxPlayer } from '../audio/Sfx';

interface Props {
  chart: Chart;
  onFinish: (stats: EngineStats) => void;
}

const JUDGEMENT_LABEL: Record<JudgementEvent['judgement'], string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

/**
 * 혼자 플레이하는 화면. 서버/방 없이 이 기기 하나에서 음악 재생(AudioEngine)과
 * 신호 판정(PlayerEngine)을 모두 처리한다. 여러 기기를 동기화할 필요가 없으므로
 * 원래 설계대로 이 기기의 AudioContext.currentTime을 유일한 시계로 사용한다.
 */
export function SoloGameScreen({ chart, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlayerEngine | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastJudgement, setLastJudgement] = useState<JudgementEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let cancelled = false;
    let audioStartCtxTime = 0;
    const audioEngine = new AudioEngine();
    const sfx = new SfxPlayer(audioEngine.context);

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const getSongTime = () =>
      audioEngine.context.currentTime - audioStartCtxTime - (chart.offset ?? 0);

    const engine = new PlayerEngine(canvas, chart, getSongTime, {
      onJudgement: (event) => {
        setScore(event.score);
        setCombo(event.combo);
        setLastJudgement(event);
        sfx.play(event.judgement);
      },
      onFinish: (stats) => onFinish(stats),
    });
    engineRef.current = engine;

    (async () => {
      await audioEngine.resume();
      if (chart.audioSrc) {
        await audioEngine.loadFromUrl(chart.audioSrc);
      } else {
        const lastNoteTime = chart.notes.length ? chart.notes[chart.notes.length - 1].time : 0;
        audioEngine.generateClickTrack(chart, lastNoteTime + 3);
      }
      if (cancelled) return;

      audioStartCtxTime = audioEngine.play(0.5);
      engine.start();
      setReady(true);
    })();

    const handleTap = () => engineRef.current?.tap();
    canvas.addEventListener('pointerdown', handleTap);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handleTap);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
      audioEngine.stop();
      void audioEngine.context.close();
    };
  }, [chart, onFinish]);

  return (
    <div className="screen player-game-screen" ref={containerRef}>
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="hud">
        <div className="hud-scoreboard">
          <div className="hud-player-row">
            <span className="hud-player-score">{score.toString().padStart(5, '0')}</span>
            {combo > 1 && <span className="hud-player-combo">{combo} combo</span>}
          </div>
        </div>
        {lastJudgement && (
          <div
            key={lastJudgement.score}
            className={`hud-judgement judgement-${lastJudgement.judgement}`}
          >
            {JUDGEMENT_LABEL[lastJudgement.judgement]}
          </div>
        )}
        {!ready && <div className="hud-loading">Loading...</div>}
      </div>
    </div>
  );
}
