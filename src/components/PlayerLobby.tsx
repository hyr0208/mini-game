import { useEffect, useState } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerInfo } from '../net/protocol';
import { SONGS } from '../data/songs';

interface Props {
  client: RoomClient;
  roomCode: string;
  myPlayerId: string;
  onGameStarting: (chartId: string, startAnchorServerTime: number) => void;
  onRoomClosed: (reason: string) => void;
}

export function PlayerLobby({ client, roomCode, myPlayerId, onGameStarting, onRoomClosed }: Props) {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [chartId, setChartId] = useState<string | null>(null);

  useEffect(() => {
    client.setCallbacks({
      onPlayerList: (list) => setPlayers(list),
      onSongSelected: (id) => setChartId(id),
      onGameStarting: (id, anchor) => onGameStarting(id, anchor),
      onRoomClosed: (reason) => onRoomClosed(reason),
    });
  }, [client, onGameStarting, onRoomClosed]);

  const song = chartId ? SONGS.find((s) => s.id === chartId) : null;

  return (
    <div className="screen player-lobby-screen">
      <h2>대기실</h2>
      <div className="room-code">{roomCode}</div>
      <p className="subtitle">호스트가 곡을 고르고 시작하길 기다리는 중...</p>
      {song && <p className="subtitle">선택된 곡: {song.title}</p>}

      <ul className="player-key-list">
        {players.map((player) => (
          <li key={player.id} className="player-key-item">
            <span className="player-dot" style={{ background: player.color }} />
            <span className="player-name">
              {player.name}
              {player.id === myPlayerId ? ' (나)' : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
