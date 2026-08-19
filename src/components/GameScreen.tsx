import { useEffect, useRef, useState } from 'react';
import type { Chart, EngineStats, JudgementEvent } from '../engine/types';
import { GameEngine } from '../engine/GameEngine';
import { KEY_TO_INPUT } from '../engine/constants';
import { AudioEngine } from '../audio/AudioEngine';
import { HUD } from './HUD';

interface Props {
  chart: Chart;
  onFinish: (stats: EngineStats) => void;
}

/**
 * 게임 화면. React는 캔버스를 마운트하고 GameEngine/AudioEngine 인스턴스를
 * 생성·정리하는 역할만 하며, 매 프레임 렌더링과 판정(돈/카)은 GameEngine 내부에서
 * 처리한다. 점수/콤보/판정 결과는 엔진 콜백을 통해서만 React state로 반영된다.
 */
export function GameScreen({ chart, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastJudgement, setLastJudgement] = useState<JudgementEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let cancelled = false;
    const audioEngine = new AudioEngine();

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const engine = new GameEngine(canvas, audioEngine.context, chart, {
      onScoreChange: setScore,
      onComboChange: setCombo,
      onJudgement: setLastJudgement,
      onFinish,
    });
    engineRef.current = engine;

    (async () => {
      await audioEngine.resume();
      if (chart.audioSrc) {
        await audioEngine.loadFromUrl(chart.audioSrc);
      } else {
        const lastNoteTime = chart.notes.length
          ? chart.notes[chart.notes.length - 1].time
          : 0;
        audioEngine.generateClickTrack(chart.notes, lastNoteTime + 3);
      }
      if (cancelled) return;

      const startAt = audioEngine.play(0.5);
      engine.start(startAt);
      setReady(true);
    })();

    const handleKeyDown = (event: KeyboardEvent) => {
      const input = KEY_TO_INPUT[event.key.toLowerCase()];
      if (!input) return;
      engineRef.current?.hit(input);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
      audioEngine.stop();
      void audioEngine.context.close();
    };
    // chart는 화면 진입 시 한 번만 반영하면 되므로 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart]);

  return (
    <div className="screen game-screen" ref={containerRef}>
      <canvas ref={canvasRef} className="game-canvas" />
      <HUD score={score} combo={combo} judgement={lastJudgement} ready={ready} />
    </div>
  );
}
