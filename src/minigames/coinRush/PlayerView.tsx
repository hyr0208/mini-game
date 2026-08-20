import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { COIN_RUSH_DURATION_MS, COIN_RUSH_SCORE_PER_COIN } from '../constants';
import type { ScoreReporter } from '../../net/ScoreReporter';
import { playTone } from '../../audio/tone';

interface Props {
  client: ScoreReporter;
  getNow: () => number;
  startAnchorServerTime: number;
}

export function CoinRushPlayerView({ client, getNow, startAnchorServerTime }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const active = elapsedMs >= 0 && elapsedMs < COIN_RUSH_DURATION_MS;
  const remainingSeconds = Math.ceil(Math.max(0, COIN_RUSH_DURATION_MS - elapsedMs) / 1000);
  const [coinCount, setCoinCount] = useState(0);
  const [lastBurst, setLastBurst] = useState(0);
  const scoreRef = useRef(0);
  const reportedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => { void ctx.close(); };
  }, []);

  useEffect(() => {
    if (elapsedMs >= COIN_RUSH_DURATION_MS && !reportedRef.current) {
      reportedRef.current = true;
      client.reportRoundScore(scoreRef.current);
    }
  }, [client, elapsedMs]);

  const handleTap = () => {
    if (!active) return;
    setCoinCount((count) => count + 1);
    setLastBurst((burst) => burst + 1);
    scoreRef.current += COIN_RUSH_SCORE_PER_COIN;
    if (coinCount % 5 === 4) client.reportLiveScore(scoreRef.current);
    if (audioCtxRef.current) playTone(audioCtxRef.current, 560 + (coinCount % 4) * 70, 0.045);
  };

  return (
    <div className="minigame-player-view coin-player-view" onPointerDown={handleTap}>
      <div className="game-kicker"><span className="kicker-dot" /> YOUR CONTROLLER</div>
      <h2 className="minigame-title">코인을 쓸어 담아!</h2>
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      {active && (
        <>
          <div className="coin-player-timer"><span>{String(remainingSeconds).padStart(2, '0')}</span><small>초 남음</small></div>
          <button type="button" className="coin-tap-button" aria-label="코인 받기">
            <span className="coin-tap-shine" />
            <span className="coin-tap-symbol">¢</span>
            <span className="coin-tap-label">TAP!</span>
          </button>
          <div className="coin-count"><strong key={lastBurst}>{coinCount}</strong><span>COINS</span></div>
        </>
      )}
      {elapsedMs >= COIN_RUSH_DURATION_MS && <div className="coin-finished"><span className="coin-finished-icon">✓</span><strong>{coinCount} 코인</strong><span>집계 중...</span></div>}
    </div>
  );
}
