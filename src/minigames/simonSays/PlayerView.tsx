import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoundClock } from '../useRoundClock';
import {
  SIMON_COLORS,
  SIMON_INPUT_TIMEOUT_MS,
  SIMON_SEQUENCE_LENGTH,
  SIMON_STEP_MS,
} from '../constants';
import type { RoomClient } from '../../net/RoomClient';
import { playTone } from '../../audio/tone';

interface Props {
  client: RoomClient;
  getNow: () => number;
  startAnchorServerTime: number;
}

const PAD_FREQ = [440, 554.4, 659.3, 880];

/**
 * 순서 암기 참가자 화면. 정답은 이 기기에 전혀 전달되지 않는다 — 호스트(공유) 화면에서
 * 본 순서를 기억해서 그대로 눌러야 한다. 다 누르거나 입력 제한 시간이 끝나면 서버로
 * 제출하고, 정오답 판정은 서버가 한다.
 */
export function SimonSaysPlayerView({ client, getNow, startAnchorServerTime }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const [guess, setGuess] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    return () => {
      void ctx.close();
    };
  }, []);

  const watchEndMs = SIMON_SEQUENCE_LENGTH * SIMON_STEP_MS;
  const inputEndMs = watchEndMs + SIMON_INPUT_TIMEOUT_MS;
  const inputActive = elapsedMs >= watchEndMs && elapsedMs < inputEndMs && !submitted;

  const submitGuess = useCallback(
    (finalGuess: number[]) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitted(true);
      client.submitSimonGuess(finalGuess);
    },
    [client],
  );

  useEffect(() => {
    if (elapsedMs >= inputEndMs) submitGuess(guess);
  }, [elapsedMs, inputEndMs, guess, submitGuess]);

  const handlePress = (index: number) => {
    if (!inputActive) return;
    const next = [...guess, index];
    setGuess(next);
    if (audioCtxRef.current) playTone(audioCtxRef.current, PAD_FREQ[index], 0.12);
    if (next.length === SIMON_SEQUENCE_LENGTH) submitGuess(next);
  };

  let statusText: string;
  if (elapsedMs < 0) statusText = '준비하세요...';
  else if (elapsedMs < watchEndMs) statusText = '호스트 화면을 보고 순서를 기억하세요!';
  else if (submitted) statusText = '제출 완료! 기다리는 중...';
  else statusText = '기억한 순서대로 누르세요!';

  return (
    <div className="minigame-player-view">
      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      <p className="subtitle">{statusText}</p>

      <div className="simon-board">
        {SIMON_COLORS.map((color, index) => (
          <button
            key={index}
            type="button"
            className="simon-pad simon-pad-button"
            style={{ background: color }}
            disabled={!inputActive}
            onPointerDown={() => handlePress(index)}
          />
        ))}
      </div>

      <div className="simon-guess-dots">
        {Array.from({ length: SIMON_SEQUENCE_LENGTH }).map((_, index) => (
          <span key={index} className={`simon-dot ${index < guess.length ? 'filled' : ''}`} />
        ))}
      </div>
    </div>
  );
}
