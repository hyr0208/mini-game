import { useEffect, useRef, useState } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerInfo, PlayerResult } from '../net/protocol';
import type { Chart } from '../engine/types';
import { CueEngine } from '../engine/CueEngine';
import { AudioEngine } from '../audio/AudioEngine';

interface LivePlayer extends PlayerInfo {
  score: number;
  combo: number;
}

interface Props {
  client: RoomClient;
  chart: Chart;
  startAnchorServerTime: number;
  initialPlayers: PlayerInfo[];
  onFinish: (results: PlayerResult[]) => void;
}

/**
 * 호스트(다같이 보는 공유 화면). React는 캔버스를 마운트하고 CueEngine/AudioEngine을
 * 생성·정리하는 역할만 하며, 신호 렌더링은 CueEngine이, 실제 음악 재생은 AudioEngine이
 * 각각 담당한다. 각 플레이어의 점수/콤보는 서버가 중계하는 메시지를 통해서만
 * React state로 반영된다 — 판정 자체는 이 화면에서 하지 않는다.
 */
export function HostGameScreen({ client, chart, startAnchorServerTime, initialPlayers, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<LivePlayer[]>(
    initialPlayers.map((p) => ({ ...p, score: 0, combo: 0 })),
  );

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

    const audioEngine = new AudioEngine();
    const getSongTime = () => (client.now() - startAnchorServerTime) / 1000;
    const engine = new CueEngine(canvas, chart, getSongTime);

    (async () => {
      await audioEngine.resume();
      if (chart.audioSrc) {
        await audioEngine.loadFromUrl(chart.audioSrc);
      } else {
        const lastNoteTime = chart.notes.length ? chart.notes[chart.notes.length - 1].time : 0;
        audioEngine.generateClickTrack(chart, lastNoteTime + 3);
      }
      const delaySec = Math.max(0.05, (startAnchorServerTime - client.now()) / 1000);
      audioEngine.play(delaySec);
      engine.start();
    })();

    client.setCallbacks({
      onPlayerUpdate: (playerId, score, combo) => {
        setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, score, combo } : p)));
      },
      onGameFinished: (results) => onFinish(results),
    });

    return () => {
      window.removeEventListener('resize', resize);
      engine.destroy();
      audioEngine.stop();
      void audioEngine.context.close();
    };
  }, [client, chart, startAnchorServerTime, onFinish]);

  return (
    <div className="screen game-screen host-game-screen" ref={containerRef}>
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="hud">
        <div className="hud-scoreboard">
          {players.map((player) => (
            <div key={player.id} className="hud-player-row">
              <span className="player-dot" style={{ background: player.color }} />
              <span className="hud-player-name">{player.name}</span>
              <span className="hud-player-score">{player.score.toString().padStart(5, '0')}</span>
              {player.combo > 1 && <span className="hud-player-combo">{player.combo} combo</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
