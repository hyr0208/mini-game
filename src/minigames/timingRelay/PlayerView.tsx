import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { RingVisual } from '../RingVisual';
import {
  JUDGEMENT_COLOR,
  RELAY_SCORE_TABLE,
  TURN_DURATION_MS,
  TURN_RING_LEAD_MS,
  judgeFromAbsDeltaMs,
} from '../constants';
import type { Judgement } from '../../net/protocol';
import type { ScoreReporter } from '../../net/ScoreReporter';
import { playTone } from '../../audio/tone';

interface Props {
  client: ScoreReporter;
  getNow: () => number;
  startAnchorServerTime: number;
  myTurnOffsetMs: number;
}

const JUDGEMENT_LABEL: Record<Judgement, string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

/**
 * 타이밍 릴레이 참가자 화면. 내 차례가 아니면 공유 화면을 보라는 대기 문구만 뜨고,
 * 내 차례가 되면 링 타이밍 챌린지가 활성화된다. 판정은 이 기기에서 직접 계산해서
 * 서버에는 최종 점수만 보고한다(서버는 봇 채점을 위해서만 판정 로직을 따로 갖는다).
 */
export function TimingRelayPlayerView({ client, getNow, startAnchorServerTime, myTurnOffsetMs }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const turnElapsed = elapsedMs - myTurnOffsetMs;
  const isMyTurn = turnElapsed >= 0 && turnElapsed < TURN_DURATION_MS;

  const [hasHit, setHasHit] = useState(false);
  const [lastJudgement, setLastJudgement] = useState<Judgement | null>(null);
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
    if (turnElapsed >= TURN_DURATION_MS && !reportedRef.current) {
      reportedRef.current = true;
      client.reportRoundScore(hasHit ? RELAY_SCORE_TABLE[lastJudgement ?? 'miss'] : 0);
    }
  }, [turnElapsed, hasHit, lastJudgement, client]);

  const handleTap = () => {
    if (!isMyTurn || hasHit) return;
    const deltaMs = turnElapsed - TURN_RING_LEAD_MS;
    const judgement = judgeFromAbsDeltaMs(Math.abs(deltaMs));
    setHasHit(true);
    setLastJudgement(judgement);
    if (audioCtxRef.current) {
      playTone(audioCtxRef.current, judgement === 'miss' ? 160 : 700 + Math.random() * 200, 0.1);
    }
  };

  const ringProgress = isMyTurn ? Math.min(1, turnElapsed / TURN_RING_LEAD_MS) : 0;
  const ringColor = hasHit && lastJudgement ? JUDGEMENT_COLOR[lastJudgement] : undefined;

  return (
    <div className="minigame-player-view relay-player-view" onPointerDown={handleTap}>
      {turnElapsed < 0 && (
        <div className="minigame-waiting">대기 중... 공유 화면을 보세요</div>
      )}
      {isMyTurn && (
        <>
          <div className="relay-my-turn-label">지금 내 차례!</div>
          <RingVisual progress={ringProgress} color={ringColor} />
        </>
      )}
      {hasHit && lastJudgement && (
        <div className={`hud-judgement judgement-${lastJudgement}`}>{JUDGEMENT_LABEL[lastJudgement]}</div>
      )}
      {turnElapsed >= TURN_DURATION_MS && (
        <div className="minigame-waiting">완료! 다른 플레이어를 기다리는 중...</div>
      )}
    </div>
  );
}
