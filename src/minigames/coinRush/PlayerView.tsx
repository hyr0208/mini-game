import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import {
  COIN_LANE_HIT_WINDOW_MS,
  COIN_LANE_INTERVAL_MS,
  COIN_LANE_PATTERN,
  COIN_RUSH_COMBO_BONUS,
  COIN_RUSH_DURATION_MS,
  COIN_RUSH_SCORE_PER_COIN,
} from '../constants';
import type { ScoreReporter } from '../../net/ScoreReporter';
import { playTone } from '../../audio/tone';

interface Props {
  client: ScoreReporter;
  getNow: () => number;
  startAnchorServerTime: number;
}

const LANE_LABEL = ['LEFT', 'CENTER', 'RIGHT'];

/** 움직이는 코인 레인과 함정을 구분해 타이밍까지 맞추는 액션 게임. */
export function CoinRushPlayerView({ client, getNow, startAnchorServerTime }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const active = elapsedMs >= 0 && elapsedMs < COIN_RUSH_DURATION_MS;
  const remainingSeconds = Math.ceil(Math.max(0, COIN_RUSH_DURATION_MS - elapsedMs) / 1000);
  const targetCount = Math.ceil(COIN_RUSH_DURATION_MS / COIN_LANE_INTERVAL_MS);
  const [hitTargets, setHitTargets] = useState<boolean[]>(() => Array(targetCount).fill(false));
  const [coinCount, setCoinCount] = useState(0);
  const [lastBurst, setLastBurst] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState<'perfect' | 'miss' | 'trap' | null>(null);
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

  const targetIndex = active ? Math.min(targetCount - 1, Math.floor(elapsedMs / COIN_LANE_INTERVAL_MS)) : -1;
  const targetLane = targetIndex >= 0 ? COIN_LANE_PATTERN[targetIndex % COIN_LANE_PATTERN.length] : -1;
  const phaseMs = active ? elapsedMs % COIN_LANE_INTERVAL_MS : 0;
  const distanceToTarget = Math.min(phaseMs, COIN_LANE_INTERVAL_MS - phaseMs);

  const handleLaneTap = (lane: number) => {
    if (!active || targetIndex < 0 || hitTargets[targetIndex]) return;
    const laneIsCorrect = lane === targetLane;
    const timeIsCorrect = distanceToTarget <= COIN_LANE_HIT_WINDOW_MS;
    if (!laneIsCorrect || !timeIsCorrect) {
      setCombo(0);
      setMisses((count) => count + 1);
      setFeedback(laneIsCorrect ? 'miss' : 'trap');
      if (audioCtxRef.current) playTone(audioCtxRef.current, 150, 0.07);
      return;
    }

    const nextCombo = combo + 1;
    const score = COIN_RUSH_SCORE_PER_COIN + Math.min(nextCombo, 8) * COIN_RUSH_COMBO_BONUS;
    setHitTargets((prev) => {
      const next = [...prev];
      next[targetIndex] = true;
      return next;
    });
    setCombo(nextCombo);
    setCoinCount((count) => count + 1);
    setLastBurst((burst) => burst + 1);
    setFeedback('perfect');
    scoreRef.current += score;
    if (coinCount % 4 === 3) client.reportLiveScore(scoreRef.current);
    if (audioCtxRef.current) playTone(audioCtxRef.current, 560 + (nextCombo % 4) * 80, 0.05);
  };

  const feedbackLabel = feedback === 'perfect'
    ? 'NICE CATCH!'
    : feedback === 'trap'
      ? '함정이야!'
      : feedback === 'miss'
        ? '타이밍을 놓쳤어'
        : '코인이 있는 레인을 골라!';

  return (
    <div className="minigame-player-view coin-player-view">
      <div className="game-kicker"><span className="kicker-dot" /> CHOOSE YOUR LANE</div>
      <h2 className="minigame-title">코인을 잡아!</h2>
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      {active && (
        <>
          <div className="coin-player-timer"><span>{String(remainingSeconds).padStart(2, '0')}</span><small>초 남음</small></div>
          <div className="coin-target-banner">
            <span className="coin-target-pulse" style={{ transform: `scale(${1 + (1 - phaseMs / COIN_LANE_INTERVAL_MS) * 0.22})` }} />
            <strong>{targetLane >= 0 ? `${LANE_LABEL[targetLane]} 레인` : '다음 코인'}</strong>
            <small>빛날 때 선택</small>
          </div>
          <div className="coin-lane-buttons">
            {LANE_LABEL.map((label, lane) => (
              <button
                type="button"
                key={label}
                className={`coin-lane-button ${lane === targetLane ? 'is-target' : ''}`}
                onPointerDown={() => handleLaneTap(lane)}
                aria-label={`${label} 레인 선택`}
              >
                <span>{lane === targetLane ? '🪙' : '💣'}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
          <div className={`coin-feedback feedback-${feedback ?? 'idle'}`}>{feedbackLabel}</div>
          <div className="coin-combo-row"><strong>{combo} COMBO</strong><span>MISS {misses}</span></div>
          <div className="coin-count"><strong key={lastBurst}>{coinCount}</strong><span>COINS</span></div>
        </>
      )}
      {elapsedMs >= COIN_RUSH_DURATION_MS && <div className="coin-finished"><span className="coin-finished-icon">✓</span><strong>{coinCount} 코인</strong><span>집계 중...</span></div>}
    </div>
  );
}
