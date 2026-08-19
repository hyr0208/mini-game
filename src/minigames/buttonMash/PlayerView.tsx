import { useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import { BUTTON_MASH_DURATION_MS, BUTTON_MASH_SCORE_PER_TAP } from '../constants';
import type { RoomClient } from '../../net/RoomClient';
import { playTone } from '../../audio/tone';

interface Props {
  client: RoomClient;
  getNow: () => number;
  startAnchorServerTime: number;
}

/**
 * 버튼 마쉬 참가자 화면. 신호(GO)가 뜨는 동안 최대한 많이 탭한다.
 * 탭 횟수는 이 기기에서만 집계하고, 실시간/최종 점수를 서버로 보고한다.
 */
export function ButtonMashPlayerView({ client, getNow, startAnchorServerTime }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const [taps, setTaps] = useState(0);
  const reportedFinalRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => {
      void ctx.close();
    };
  }, []);

  const active = elapsedMs >= 0 && elapsedMs < BUTTON_MASH_DURATION_MS;
  const ended = elapsedMs >= BUTTON_MASH_DURATION_MS;

  useEffect(() => {
    if (ended && !reportedFinalRef.current) {
      reportedFinalRef.current = true;
      client.reportRoundScore(taps * BUTTON_MASH_SCORE_PER_TAP);
    }
  }, [ended, taps, client]);

  const handleTap = () => {
    if (!active) return;
    setTaps((prev) => {
      const next = prev + 1;
      client.reportLiveScore(next * BUTTON_MASH_SCORE_PER_TAP);
      return next;
    });
    if (audioCtxRef.current) playTone(audioCtxRef.current, 500 + Math.random() * 200, 0.06);
  };

  return (
    <div className="minigame-player-view">
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      {active && (
        <button type="button" className="mash-button" onPointerDown={handleTap}>
          TAP!
        </button>
      )}
      {ended && <div className="minigame-waiting">시간 종료! 다른 플레이어를 기다리는 중...</div>}
      <div className="minigame-tap-count">{taps}</div>
    </div>
  );
}
