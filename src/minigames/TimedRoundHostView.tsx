import { useMemo } from 'react';
import { useRoundClock } from './useRoundClock';
import type { PlayerInfo } from '../net/protocol';

interface Props {
  title: string;
  description: string;
  durationMs: number;
  getNow: () => number;
  startAnchorServerTime: number;
  players: PlayerInfo[];
  liveScores: Record<string, number>;
}

/** 버튼 마쉬/조준 클릭처럼 "카운트다운 → GO → 타이머" 흐름을 공유하는 게임들의 호스트 화면. */
export function TimedRoundHostView({
  title,
  description,
  durationMs,
  getNow,
  startAnchorServerTime,
  players,
  liveScores,
}: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);

  const ranked = useMemo(
    () => [...players].sort((a, b) => (liveScores[b.id] ?? 0) - (liveScores[a.id] ?? 0)),
    [players, liveScores],
  );

  return (
    <div className="minigame-host-view">
      <h2 className="minigame-title">{title}</h2>
      <p className="subtitle">{description}</p>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      {elapsedMs >= 0 && elapsedMs < durationMs && (
        <>
          <div className="minigame-go">GO!</div>
          <div className="minigame-timer-track">
            <div
              className="minigame-timer-fill"
              style={{ width: `${((durationMs - elapsedMs) / durationMs) * 100}%` }}
            />
          </div>
        </>
      )}

      {elapsedMs >= durationMs && <div className="minigame-waiting">결과 집계 중...</div>}

      <div className="minigame-live-board">
        {ranked.map((player) => (
          <div key={player.id} className="minigame-live-row">
            <span className="player-dot" style={{ background: player.color }} />
            <span className="hud-player-name">{player.name}</span>
            <span className="minigame-live-score">{liveScores[player.id] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
