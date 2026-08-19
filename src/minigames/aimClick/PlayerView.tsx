import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { AIM_DURATION_MS, AIM_SCORE_PER_HIT, AIM_TARGET_RADIUS } from '../constants';
import type { RoomClient } from '../../net/RoomClient';
import { playTone } from '../../audio/tone';

interface Props {
  client: RoomClient;
  getNow: () => number;
  startAnchorServerTime: number;
}

function randomPos() {
  return { x: 12 + Math.random() * 76, y: 18 + Math.random() * 60 };
}

/**
 * 조준 클릭 참가자 화면. 이 기기의 화면에만 나타나는 타겟을 최대한 정확하고
 * 빠르게 클릭한다. 타겟 위치는 각자 로컬에서 독립적으로 생성한다 — 순수 개인 기량
 * 테스트라 굳이 모든 기기가 같은 위치를 봐야 할 필요가 없다.
 */
export function AimClickPlayerView({ client, getNow, startAnchorServerTime }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const [hits, setHits] = useState(0);
  const [pos, setPos] = useState(randomPos);
  const reportedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => {
      void ctx.close();
    };
  }, []);

  const active = elapsedMs >= 0 && elapsedMs < AIM_DURATION_MS;
  const ended = elapsedMs >= AIM_DURATION_MS;

  useEffect(() => {
    if (ended && !reportedRef.current) {
      reportedRef.current = true;
      client.reportRoundScore(hits * AIM_SCORE_PER_HIT);
    }
  }, [ended, hits, client]);

  const handleHit = () => {
    if (!active) return;
    setHits((prev) => {
      const next = prev + 1;
      client.reportLiveScore(next * AIM_SCORE_PER_HIT);
      return next;
    });
    setPos(randomPos());
    if (audioCtxRef.current) playTone(audioCtxRef.current, 700, 0.08);
  };

  return (
    <div className="minigame-player-view aim-click-view">
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      {active && (
        <button
          type="button"
          className="aim-target"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: AIM_TARGET_RADIUS * 2,
            height: AIM_TARGET_RADIUS * 2,
          }}
          onPointerDown={handleHit}
        />
      )}
      {ended && <div className="minigame-waiting">시간 종료! 다른 플레이어를 기다리는 중...</div>}
      <div className="minigame-tap-count">{hits}</div>
    </div>
  );
}
