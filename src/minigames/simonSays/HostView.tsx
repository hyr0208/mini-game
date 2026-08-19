import { useRoundClock } from '../useRoundClock';
import { SIMON_COLORS, SIMON_INPUT_TIMEOUT_MS, SIMON_STEP_MS } from '../constants';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  sequence: number[];
}

/**
 * 순서 암기 호스트(공유) 화면. 이 화면에만 정답 시퀀스가 깜빡이며 표시된다 —
 * 참가자들은 실제 이 화면을 보고 기억한 뒤, 각자 자기 기기에서 그대로 따라 누른다.
 */
export function SimonSaysHostView({ getNow, startAnchorServerTime, sequence }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const watchEndMs = sequence.length * SIMON_STEP_MS;
  const inputEndMs = watchEndMs + SIMON_INPUT_TIMEOUT_MS;

  const activeStepIndex =
    elapsedMs >= 0 && elapsedMs < watchEndMs ? Math.floor(elapsedMs / SIMON_STEP_MS) : -1;

  let phaseLabel: string;
  if (elapsedMs < 0) phaseLabel = '준비하세요...';
  else if (elapsedMs < watchEndMs) phaseLabel = '잘 보고 순서를 기억하세요!';
  else if (elapsedMs < inputEndMs) phaseLabel = '이제 각자 기기에서 순서대로 눌러보세요!';
  else phaseLabel = '결과 집계 중...';

  return (
    <div className="minigame-host-view">
      <h2 className="minigame-title">순서 암기</h2>
      <p className="subtitle">{phaseLabel}</p>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}

      <div className="simon-board">
        {SIMON_COLORS.map((color, index) => (
          <div
            key={index}
            className={`simon-pad ${activeStepIndex >= 0 && sequence[activeStepIndex] === index ? 'lit' : ''}`}
            style={{ background: color }}
          />
        ))}
      </div>

      {elapsedMs >= watchEndMs && elapsedMs < inputEndMs && (
        <div className="minigame-waiting">참가자들이 입력 중이에요...</div>
      )}
    </div>
  );
}
