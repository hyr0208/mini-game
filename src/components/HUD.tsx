import type { JudgementEvent } from '../engine/types';

interface Props {
  score: number;
  combo: number;
  judgement: JudgementEvent | null;
  ready: boolean;
}

const JUDGEMENT_LABEL: Record<JudgementEvent['judgement'], string> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
  miss: 'MISS',
};

/**
 * 순수 표시용 컴포넌트. 게임 루프나 판정 로직을 전혀 갖지 않고
 * GameEngine의 콜백으로 전달된 값을 그대로 렌더링만 한다.
 */
export function HUD({ score, combo, judgement, ready }: Props) {
  return (
    <div className="hud">
      <div className="hud-score">{score.toString().padStart(6, '0')}</div>
      {combo > 1 && <div className="hud-combo">{combo} COMBO</div>}
      {judgement && (
        <div
          key={`${judgement.input}-${judgement.score}`}
          className={`hud-judgement judgement-${judgement.judgement}`}
        >
          {JUDGEMENT_LABEL[judgement.judgement]}
        </div>
      )}
      {!ready && <div className="hud-loading">Loading...</div>}
      <div className="hud-keys">
        <div className="hud-key-group">
          <span className="hud-key hud-key-ka">D</span>
          <span className="hud-key hud-key-don">F</span>
          <span className="hud-key hud-key-don">J</span>
          <span className="hud-key hud-key-ka">K</span>
        </div>
        <div className="hud-key-labels">
          <span className="hud-key-label hud-key-label-ka">카</span>
          <span className="hud-key-label hud-key-label-don">돈</span>
          <span className="hud-key-label hud-key-label-don">돈</span>
          <span className="hud-key-label hud-key-label-ka">카</span>
        </div>
      </div>
    </div>
  );
}
