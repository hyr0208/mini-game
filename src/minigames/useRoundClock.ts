import { useEffect, useRef, useState } from 'react';

/**
 * startAnchorServerTime 기준으로 흐르는 시간(ms)을 매 프레임 추적하는 훅.
 * getNow는 RoomClient의 서버 동기화 시계(now())를 넘긴다 — 그래야 여러 기기에서
 * 같은 순간에 같은 값을 보게 된다. 음수면 아직 라운드가 시작되기 전(카운트다운 중)이다.
 */
export function useRoundClock(getNow: () => number, startAnchorServerTime: number): number {
  const [elapsedMs, setElapsedMs] = useState(() => getNow() - startAnchorServerTime);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setElapsedMs(getNow() - startAnchorServerTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [getNow, startAnchorServerTime]);

  return elapsedMs;
}
