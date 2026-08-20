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
}

/**
 * 다같이 완성하기 참가자 화면. 정해진 박자마다 탭해야 한다. 판정은 이 기기에서
 * 직접 계산하고, 라운드가 끝나면 최종 누적 점수를(round_score) 보고한다.
 */
export function SyncBuildPlayerView({ client, getNow, startAnchorServerTime, beatCount, beatIntervalMs }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const totalMs = beatCount * beatIntervalMs;

  // hitBeats는 실제로 맞춘 박자만 기록한다. "놓친 박자"는 상태로 저장하지 않고,
  // 렌더링 시 elapsedMs로부터 그때그때 파생시킨다 — 매 프레임 값이 바뀌는 것을
  // 굳이 state/effect로 동기화할 필요가 없다.
  const [hitBeats, setHitBeats] = useState<boolean[]>(() => Array(beatCount).fill(false));
  const [lastJudgement, setLastJudgement] = useState<Judgement | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const scoreRef = useRef(0);
  const reportedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => {
      void ctx.close();
    };
  }, []);

  useEffect(() => {
    if (elapsedMs >= totalMs && !reportedRef.current) {
      reportedRef.current = true;
      client.reportRoundScore(scoreRef.current);
    }
  }, [elapsedMs, totalMs, client]);

  const isBeatPassed = (index: number) => elapsedMs > index * beatIntervalMs + HIT_WINDOWS_MS.good;

  const handleTap = () => {
    if (elapsedMs < 0 || elapsedMs >= totalMs) return;

    let bestIndex = -1;
    let bestAbs = Infinity;
    for (let i = 0; i < beatCount; i++) {
      if (hitBeats[i] || isBeatPassed(i)) continue;
      const target = i * beatIntervalMs;
      const abs = Math.abs(elapsedMs - target);
      if (abs <= HIT_WINDOWS_MS.good && abs < bestAbs) {
        bestAbs = abs;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) return;

    const judgement = judgeFromAbsDeltaMs(bestAbs);
    setHitBeats((prev) => {
      const next = [...prev];
      next[bestIndex] = true;
      return next;
    });
    scoreRef.current += SYNC_SCORE_TABLE[judgement];
    setLastJudgement(judgement);
    setHitCount((c) => c + 1);
    if (audioCtxRef.current) {
      playTone(audioCtxRef.current, judgement === 'miss' ? 160 : 600 + Math.random() * 150, 0.09);
    }
  };

  const beatPhase = elapsedMs < 0 ? 0 : (elapsedMs % beatIntervalMs) / beatIntervalMs;

  return (
    <div className="minigame-player-view" onPointerDown={handleTap}>
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      {elapsedMs >= 0 && elapsedMs < totalMs && (
        <div
          className="beat-pulse"
          style={{ transform: `scale(${1 + (1 - beatPhase) * 0.3})`, opacity: 1 - beatPhase * 0.6 }}
        />
      )}

      <div className="sync-guess-dots">
        {hitBeats.map((hit, index) => (
          <span
            key={index}
            className={`simon-dot ${hit ? 'filled' : ''} ${!hit && isBeatPassed(index) ? 'missed' : ''}`}
          />
        ))}
      </div>

      {lastJudgement && (
        <div key={hitCount} className="hud-judgement" style={{ color: JUDGEMENT_COLOR[lastJudgement] }}>
          {lastJudgement.toUpperCase()}
        </div>
      )}

      {elapsedMs >= totalMs && <div className="minigame-waiting">완료! 다른 플레이어를 기다리는 중...</div>}
    </div>
  );
}
