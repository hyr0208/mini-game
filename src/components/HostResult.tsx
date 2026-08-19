import type { PlayerResult } from '../net/protocol';

interface Props {
  results: PlayerResult[];
  onPlayAgain: () => void;
  onExit: () => void;
}

const RANK_LABEL = ['1st', '2nd', '3rd', '4th'];

export function HostResult({ results, onPlayAgain, onExit }: Props) {
  return (
    <div className="screen result-screen">
      <h2>RESULT</h2>
      <ul className="result-ranking">
        {results.map((result, index) => (
          <li key={result.id} className="result-rank-row">
            <span className="rank-label">{RANK_LABEL[index] ?? `${index + 1}th`}</span>
            <span className="player-dot" style={{ background: result.color }} />
            <span className="rank-name">{result.name}</span>
            <span className="rank-score">{result.score}</span>
            <span className="rank-combo">MAX {result.maxCombo}</span>
          </li>
        ))}
      </ul>
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onPlayAgain}>
          다른 곡 하기
        </button>
        <button type="button" className="secondary-button" onClick={onExit}>
          방 나가기
        </button>
      </div>
    </div>
  );
}
