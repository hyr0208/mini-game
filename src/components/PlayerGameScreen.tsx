import { useEffect, useRef, useState } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerResult } from '../net/protocol';
import type { Chart, JudgementEvent } from '../engine/types';
import { PlayerEngine } from '../engine/PlayerEngine';

interface Props {
  client: RoomClient;
  chart: Chart;
  startAnchorServerTime: number;
  /** 서버가 전체 결과를 집계해 game_finished를 보내오면 호출된다 (내가 먼저 끝나도 아직은 아님). */
  onRoundFinished: (results: PlayerResult[]) => void;
}

const JUDGEMENT_LABEL: Record<JudgementEvent['judgement'], string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

/**
 * 플레이어 자신의 기기(폰/PC) 화면. React는 캔버스를 마운트하고 PlayerEngine을
 * 생성·정리하는 역할만 하며, 신호 렌더링과 탭 판정은 PlayerEngine 내부에서 처리한다.
 * 판정이 나올 때마다 서버로 점수/콤보를 보고해 호스트 화면에 실시간 반영되게 한다.
 * 내가 먼저 끝나도 다른 플레이어가 아직 플레이 중일 수 있으므로, 서버가 전체 결과를
 * 모아 game_finished를 보내올 때까지는 "결과 기다리는 중" 상태로 대기한다.
 */
export function PlayerGameScreen({ client, chart, startAnchorServerTime, onRoundFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlayerEngine | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastJudgement, setLastJudgement] = useState<JudgementEvent | null>(null);
  const [waitingForOthers, setWaitingForOthers] = useState(false);

  useEffect(() => {
    client.setCallbacks({
      onGameFinished: (results) => onRoundFinished(results),
    });
  }, [client, onRoundFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const getSongTime = () => (client.now() - startAnchorServerTime) / 1000;
    const engine = new PlayerEngine(canvas, chart, getSongTime, {
      onJudgement: (event) => {
        setScore(event.score);
        setCombo(event.combo);
        setLastJudgement(event);
        client.reportUpdate(event.score, event.combo);
      },
      onFinish: (stats) => {
        client.reportFinished(stats.score, stats.maxCombo);
        setWaitingForOthers(true);
      },
    });
    engineRef.current = engine;
    engine.start();

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
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handleTap);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
    };
  }, [client, chart, startAnchorServerTime]);

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
        {lastJudgement && !waitingForOthers && (
          <div
            key={lastJudgement.score}
            className={`hud-judgement judgement-${lastJudgement.judgement}`}
          >
            {JUDGEMENT_LABEL[lastJudgement.judgement]}
          </div>
        )}
        {waitingForOthers && <div className="hud-loading">다른 플레이어를 기다리는 중...</div>}
      </div>
    </div>
  );
}
