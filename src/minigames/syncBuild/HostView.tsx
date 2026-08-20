import { useMemo } from 'react';
import { useRoundClock } from '../useRoundClock';
import { CharacterAvatar } from '../CharacterAvatar';
import type { BeatPlanEntry, PlayerInfo } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  beatCount: number;
  beatIntervalMs: number;
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
  beatPlan,
  players,
}: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const totalMs = beatCount * beatIntervalMs;

  const currentBeat = elapsedMs < 0 ? -1 : Math.min(beatCount - 1, Math.floor(elapsedMs / beatIntervalMs));
  const revealedLayers = elapsedMs < 0 ? 0 : Math.min(beatCount, Math.floor(elapsedMs / beatIntervalMs) + 1);
  const complete = elapsedMs >= totalMs;

  const participants = useMemo(
    () => [
      ...players.map((p) => ({ id: p.id, name: p.name, color: p.color, isBot: false })),
      ...beatPlan.map((b) => ({ id: b.participantId, name: b.name, color: b.color, isBot: true })),
    ],
    [players, beatPlan],
  );

  return (
    <div className="minigame-host-view">
      <h2 className="minigame-title">다같이 완성하기</h2>
      <p className="subtitle">
        {complete ? '완성했어요!' : '다같이 같은 박자에 맞춰 눌러서 함께 완성해요'}
      </p>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

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
