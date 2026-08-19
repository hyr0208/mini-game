import type { RoundResultEntry } from '../net/protocol';

interface Props {
  entries: RoundResultEntry[];
  myPlayerId?: string;
  roundIndex: number;
  totalRounds: number;
}

const RANK_LABEL = ['1st', '2nd', '3rd', '4th'];

export function RoundResultBoard({ entries, myPlayerId, roundIndex, totalRounds }: Props) {
  return (
    <div className="screen result-screen">
      <h2>ROUND {roundIndex + 1} 결과</h2>
      <p className="subtitle">
        {roundIndex + 1 < totalRounds ? '잠시 후 다음 게임이 시작돼요' : '마지막 라운드였어요!'}
      </p>
      <ul className="result-ranking">
        {entries.map((entry, index) => (
          <li
            key={entry.playerId}
            className={`result-rank-row ${entry.playerId === myPlayerId ? 'me' : ''}`}
          >
            <span className="rank-label">{RANK_LABEL[index] ?? `${index + 1}th`}</span>
            <span className="player-dot" style={{ background: entry.color }} />
            <span className="rank-name">{entry.name}</span>
            <span className="rank-score">+{entry.roundScore}</span>
            <span className="rank-combo">총 {entry.totalScore}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
