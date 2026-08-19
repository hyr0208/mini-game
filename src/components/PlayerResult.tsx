import { useEffect } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerResult as PlayerResultData } from '../net/protocol';

interface Props {
  client: RoomClient;
  results: PlayerResultData[];
  myPlayerId: string;
  onGameStarting: (chartId: string, startAnchorServerTime: number) => void;
  onLeave: () => void;
}

const RANK_LABEL = ['1st', '2nd', '3rd', '4th'];

/** 다음 라운드를 위해 호스트가 다시 시작하면 자동으로 게임 화면으로 넘어간다. */
export function PlayerResult({ client, results, myPlayerId, onGameStarting, onLeave }: Props) {
  useEffect(() => {
    client.setCallbacks({
      onGameStarting: (chartId, anchor) => onGameStarting(chartId, anchor),
    });
  }, [client, onGameStarting]);

  return (
    <div className="screen result-screen">
      <h2>RESULT</h2>
      <ul className="result-ranking">
        {results.map((result, index) => (
          <li
            key={result.id}
            className={`result-rank-row ${result.id === myPlayerId ? 'me' : ''}`}
          >
            <span className="rank-label">{RANK_LABEL[index] ?? `${index + 1}th`}</span>
            <span className="player-dot" style={{ background: result.color }} />
            <span className="rank-name">
              {result.name}
              {result.id === myPlayerId ? ' (나)' : ''}
            </span>
            <span className="rank-score">{result.score}</span>
          </li>
        ))}
      </ul>
      <p className="subtitle">호스트가 다음 곡을 준비하고 있어요</p>
      <button type="button" className="secondary-button" onClick={onLeave}>
        나가기
      </button>
    </div>
  );
}
