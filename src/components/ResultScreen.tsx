import type { EngineStats } from '../engine/types';

interface Props {
  stats: EngineStats;
  onRetry: () => void;
  onExit: () => void;
}

export function ResultScreen({ stats, onRetry, onExit }: Props) {
  return (
    <div className="screen result-screen">
      <h2>RESULT</h2>
      <div className="result-score">{stats.score}</div>
      <div className="result-combo">MAX COMBO {stats.maxCombo}</div>
      <ul className="result-counts">
        <li>PERFECT {stats.counts.perfect}</li>
        <li>GREAT {stats.counts.great}</li>
        <li>GOOD {stats.counts.good}</li>
        <li>MISS {stats.counts.miss}</li>
      </ul>
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onRetry}>
          다시하기
        </button>
        <button type="button" className="secondary-button" onClick={onExit}>
          곡 선택으로
        </button>
      </div>
    </div>
  );
}
