import type { SessionResultEntry } from '../net/protocol';

interface Props {
  entries: SessionResultEntry[];
  myPlayerId?: string;
  onPlayAgain?: () => void;
  onExit: () => void;
}

const RANK_LABEL = ['1st', '2nd', '3rd', '4th'];

export function SessionResultBoard({ entries, myPlayerId, onPlayAgain, onExit }: Props) {
  return (
    <div className="screen result-screen">
      <div className="result-burst result-burst-final">🏆</div>
      <span className="eyebrow">GAME NIGHT COMPLETE</span>
      <h2>오늘의 챔피언</h2>
      <p className="subtitle">모두의 플레이가 끝났어요. 다음 승부는 더 뜨겁게!</p>
      <ul className="result-ranking">
        {entries.map((entry, index) => (
          <li
            key={entry.playerId}
            className={`result-rank-row ${entry.playerId === myPlayerId ? 'me' : ''}`}
          >
            <span className="rank-label">{index === 0 ? '★' : RANK_LABEL[index] ?? `${index + 1}th`}</span>
            <span className="player-dot" style={{ background: entry.color }} />
            <span className="rank-name">{entry.name}</span>
            <span className="rank-score">{entry.totalScore.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="result-actions">
        {onPlayAgain && (
          <button type="button" className="primary-button" onClick={onPlayAgain}>
            다시하기
          </button>
        )}
        <button type="button" className="secondary-button" onClick={onExit}>
          나가기
        </button>
      </div>
    </div>
  );
}
