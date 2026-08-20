import { useMemo } from 'react';
import { useRoundClock } from '../useRoundClock';
import { CharacterAvatar } from '../CharacterAvatar';
import type { BeatPlanEntry, PlayerInfo } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  beatCount: number;
  beatIntervalMs: number;
  beatIntervalsMs?: number[];
  beatTargets?: number[];
  beatPlan: BeatPlanEntry[];
  players: PlayerInfo[];
}

/**
 * 다같이 완성하기 호스트(공유) 화면. 참가자 전원(사람+봇)이 같은 박자에 맞춰 눌러
 * 중앙의 공유 오브젝트를 함께 완성한다. 봇의 박자별 결과는 서버가 미리 계산해서
 * beatPlan에 실어보내므로, 이 화면은 그에 맞춰 캐릭터 표정만 재생하면 된다.
 */
export function SyncBuildHostView({
  getNow,
  startAnchorServerTime,
  beatCount,
  beatIntervalMs,
  beatIntervalsMs,
  beatTargets,
  beatPlan,
  players,
}: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const intervals = beatIntervalsMs?.length ? beatIntervalsMs : Array.from({ length: beatCount }, () => beatIntervalMs);
  const beatStarts = intervals.reduce<number[]>((starts, _interval, index) => {
    starts.push(index === 0 ? 0 : starts[index - 1] + intervals[index - 1]);
    return starts;
  }, []);
  const totalMs = intervals.reduce((sum, interval) => sum + interval, 0);
  const currentBeat = elapsedMs < 0 || elapsedMs >= totalMs
    ? -1
    : Math.min(beatCount - 1, Math.max(0, beatStarts.findIndex((start, index) =>
      elapsedMs >= start && elapsedMs < start + intervals[index],
    )));
  const revealedLayers = elapsedMs < 0
    ? 0
    : Math.min(beatCount, beatStarts.filter((start) => elapsedMs >= start).length);
  const complete = elapsedMs >= totalMs;
  const activeLane = currentBeat >= 0 ? beatTargets?.[currentBeat] ?? currentBeat % 3 : -1;

  const participants = useMemo(
    () => [
      ...players.map((p) => ({ id: p.id, name: p.name, color: p.color, isBot: false })),
      ...beatPlan.map((b) => ({ id: b.participantId, name: b.name, color: b.color, isBot: true })),
    ],
    [players, beatPlan],
  );

  return (
    <div className="minigame-host-view sync-host-view">
      <h2 className="minigame-title">다같이 완성하기</h2>
      <p className="subtitle">
        {complete ? '완성했어요!' : '화면의 과일을 보고 같은 레인을 박자에 맞춰 눌러요'}
      </p>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      <div className="sync-lane-stage">
        {['🍓', '🍋', '🍇'].map((fruit, lane) => (
          <div className={`sync-stage-lane ${activeLane === lane ? 'is-target' : ''}`} key={fruit}>
            <span className="sync-stage-lane-fruit">{fruit}</span>
            <span className="sync-stage-lane-light" />
          </div>
        ))}
      </div>

      <div className="sync-tower">
        {Array.from({ length: beatCount }).map((_, index) => (
          <div key={index} className={`sync-layer ${index < revealedLayers ? 'revealed' : ''}`} />
        ))}
      </div>

      <div className="sync-characters" key={currentBeat}>
        {participants.map((p) => (
          <CharacterAvatar
            key={p.id}
            name={p.name}
            color={p.color}
            mood={currentBeat >= 0 ? 'happy' : 'idle'}
          />
        ))}
      </div>
    </div>
  );
}
