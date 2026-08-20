import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { HIT_WINDOWS_MS, JUDGEMENT_COLOR, SYNC_SCORE_TABLE, judgeFromAbsDeltaMs } from '../constants';
import type { Judgement } from '../../net/protocol';
import type { ScoreReporter } from '../../net/ScoreReporter';
import { playTone } from '../../audio/tone';

interface Props {
  client: ScoreReporter;
  getNow: () => number;
  startAnchorServerTime: number;
  beatCount: number;
  beatIntervalMs: number;
  beatIntervalsMs?: number[];
  beatTargets?: number[];
}

const LANE_FRUIT = ['🍓', '🍋', '🍇'];
const LANE_LABEL = ['왼쪽', '가운데', '오른쪽'];

/** 박자에 맞춰 세 개의 레인 중 목표 과일을 골라야 하는 액션 미니게임. */
export function SyncBuildPlayerView({
  client,
  getNow,
  startAnchorServerTime,
  beatCount,
  beatIntervalMs,
  beatIntervalsMs,
  beatTargets,
}: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const intervals = beatIntervalsMs?.length ? beatIntervalsMs : Array.from({ length: beatCount }, () => beatIntervalMs);
  const beatStarts = intervals.reduce<number[]>((starts, _interval, index) => {
    starts.push(index === 0 ? 0 : starts[index - 1] + intervals[index - 1]);
    return starts;
  }, []);
  const totalMs = intervals.reduce((sum, interval) => sum + interval, 0);
  const [hitBeats, setHitBeats] = useState<boolean[]>(() => Array(beatCount).fill(false));
  const [lastJudgement, setLastJudgement] = useState<Judgement | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const scoreRef = useRef(0);
  const reportedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => { void ctx.close(); };
  }, []);

  useEffect(() => {
    if (elapsedMs >= totalMs && !reportedRef.current) {
      reportedRef.current = true;
      client.reportRoundScore(scoreRef.current);
    }
  }, [client, elapsedMs, totalMs]);

  const isBeatPassed = (index: number) => elapsedMs > beatStarts[index] + HIT_WINDOWS_MS.good;
  const targetLaneFor = (index: number) => beatTargets?.[index] ?? index % 3;
  const activeBeat = elapsedMs < 0 || elapsedMs >= totalMs
    ? -1
    : beatStarts.findIndex((start, index) => elapsedMs >= start && elapsedMs < start + intervals[index]);
  const activeLane = activeBeat >= 0 ? targetLaneFor(activeBeat) : -1;
  const beatPhase = activeBeat < 0 ? 0 : (elapsedMs - beatStarts[activeBeat]) / intervals[activeBeat];

  const registerMiss = () => {
    setLastJudgement('miss');
    setCombo(0);
    setMistakes((count) => count + 1);
    setHitCount((count) => count + 1);
    if (audioCtxRef.current) playTone(audioCtxRef.current, 150, 0.07);
  };

  const handleLaneTap = (lane: number) => {
    if (elapsedMs < 0 || elapsedMs >= totalMs || activeBeat < 0) return;
    if (lane !== activeLane) {
      registerMiss();
      return;
    }

    let bestIndex = -1;
    let bestAbs = Infinity;
    for (let index = 0; index < beatCount; index += 1) {
      if (hitBeats[index] || isBeatPassed(index) || targetLaneFor(index) !== lane) continue;
      const abs = Math.abs(elapsedMs - beatStarts[index]);
      if (abs <= HIT_WINDOWS_MS.good && abs < bestAbs) {
        bestAbs = abs;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) {
      registerMiss();
      return;
    }

    const judgement = judgeFromAbsDeltaMs(bestAbs);
    const nextCombo = combo + 1;
    setHitBeats((prev) => {
      const next = [...prev];
      next[bestIndex] = true;
      return next;
    });
    setCombo(nextCombo);
    setLastJudgement(judgement);
    setHitCount((count) => count + 1);
    scoreRef.current += SYNC_SCORE_TABLE[judgement] + Math.min(nextCombo, 5) * 25;
    if (nextCombo % 2 === 0) client.reportLiveScore(scoreRef.current);
    if (audioCtxRef.current) playTone(audioCtxRef.current, 600 + (nextCombo % 4) * 90, 0.09);
  };

  return (
    <div className="minigame-player-view sync-player-view">
      <div className="game-kicker"><span className="kicker-dot" /> PICK THE TARGET</div>
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      {elapsedMs >= 0 && elapsedMs < totalMs && (
        <div
          className="beat-pulse"
          style={{ transform: `scale(${1 + (1 - beatPhase) * 0.3})`, opacity: 1 - beatPhase * 0.6 }}
        />
      )}

      <div className="sync-guess-dots">
        {hitBeats.map((hit, index) => (
          <span key={index} className={`simon-dot ${hit ? 'filled' : ''} ${!hit && isBeatPassed(index) ? 'missed' : ''}`} />
        ))}
      </div>

      <div className="sync-target-callout">
        {activeLane >= 0 ? <><span className="sync-target-fruit">{LANE_FRUIT[activeLane]}</span><strong>{LANE_LABEL[activeLane]} 과일!</strong></> : <span>다음 과일을 기다리세요</span>}
      </div>

      <div className="sync-lane-buttons">
        {LANE_FRUIT.map((fruit, lane) => (
          <button
            type="button"
            key={fruit}
            className={`sync-lane-button ${activeLane === lane ? 'is-target' : ''}`}
            onPointerDown={() => handleLaneTap(lane)}
            aria-label={`${LANE_LABEL[lane]} ${fruit} 선택`}
          >
            <span className="sync-lane-fruit">{fruit}</span>
            <small>{LANE_LABEL[lane]}</small>
          </button>
        ))}
      </div>

      {lastJudgement && <div key={hitCount} className="hud-judgement" style={{ color: JUDGEMENT_COLOR[lastJudgement] }}>{lastJudgement.toUpperCase()}</div>}
      <div className="sync-combo-row"><strong>{combo} COMBO</strong><span>MISS {mistakes}</span></div>
      {elapsedMs >= totalMs && <div className="minigame-waiting">완료! 다른 플레이어를 기다리는 중...</div>}
    </div>
  );
}
