import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { CharacterAvatar } from '../CharacterAvatar';
import { RingVisual } from '../RingVisual';
import { JUDGEMENT_COLOR, TURN_DURATION_MS, TURN_RING_LEAD_MS } from '../constants';
import type { TurnPlanEntry } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  turnPlan: TurnPlanEntry[];
}

/**
 * 타이밍 릴레이 호스트(공유) 화면. 참가자 전원(사람+봇)이 순서대로 한 명씩 턴을 받는다.
 * 봇의 결과는 서버가 라운드 시작 시점에 미리 계산해서 turnPlan에 실어보내므로,
 * 이 화면은 정확히 그 타이밍에 "봇이 눌렀다" 연출만 재생하면 된다.
 */
export function TimingRelayHostView({ getNow, startAnchorServerTime, turnPlan }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const [botHitIndex, setBotHitIndex] = useState<number | null>(null);
  const lastProcessedBotHit = useRef(-1);

  const activeIndex = turnPlan.findIndex(
    (t) => elapsedMs >= t.turnStartOffsetMs && elapsedMs < t.turnStartOffsetMs + TURN_DURATION_MS,
  );
  const activeTurn = activeIndex >= 0 ? turnPlan[activeIndex] : null;
  const turnElapsed = activeTurn ? elapsedMs - activeTurn.turnStartOffsetMs : 0;
  const ringProgress = activeTurn ? Math.min(1, turnElapsed / TURN_RING_LEAD_MS) : 0;

  useEffect(() => {
    if (!activeTurn?.isBot || !activeTurn.botResult) return;
    const hitAt = TURN_RING_LEAD_MS + activeTurn.botResult.deltaMs;
    if (turnElapsed >= hitAt && lastProcessedBotHit.current !== activeIndex) {
      lastProcessedBotHit.current = activeIndex;
      setBotHitIndex(activeIndex);
    }
  }, [activeIndex, activeTurn, turnElapsed]);

  const ringColor =
    activeTurn?.isBot && botHitIndex === activeIndex && activeTurn.botResult
      ? JUDGEMENT_COLOR[activeTurn.botResult.judgement]
      : undefined;

  return (
    <div className="minigame-host-view relay-host-view">
      <h2 className="minigame-title">타이밍 릴레이</h2>
      <p className="subtitle">순서대로 한 명씩, 자기 차례에 딱 맞춰 눌러요</p>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      {activeTurn && (
        <div className="relay-active-turn">
          <RingVisual progress={ringProgress} color={ringColor} />
        </div>
      )}

      {!activeTurn && elapsedMs >= 0 && <div className="minigame-waiting">결과 집계 중...</div>}

      <div className="relay-lineup">
        {turnPlan.map((entry, index) => (
          <CharacterAvatar
            key={entry.participantId}
            name={entry.name}
            color={entry.color}
            active={index === activeIndex}
            mood={
              index === activeIndex && entry.isBot && botHitIndex === activeIndex && entry.botResult
                ? entry.botResult.judgement === 'miss'
                  ? 'sad'
                  : 'happy'
                : 'idle'
            }
          />
        ))}
      </div>
    </div>
  );
}
