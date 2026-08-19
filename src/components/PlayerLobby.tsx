import { useEffect, useState } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerInfo } from '../net/protocol';
import { SONGS } from '../data/songs';

interface Props {
  client: RoomClient;
  roomCode: string;
  players: PlayerInfo[];
  myPlayerId: string;
  onGameStarting: (chartId: string, startAnchorServerTime: number) => void;
  onRoomClosed: (reason: string) => void;
}

/**
 * players는 App이 방 참가 시점에 한 번 등록한 콜백으로 채워지는 로스터를 그대로
 * 전달받는다. 여기서 다시 onPlayerList를 등록하면 App의 등록을 덮어써 게임 화면에서
 * 필요한 실시간 순위 계산용 로스터가 갱신을 멈추므로, 이 화면은 로스터 수신에 관여하지 않는다.
 */
export function PlayerLobby({ client, roomCode, players, myPlayerId, onGameStarting, onRoomClosed }: Props) {
  const [chartId, setChartId] = useState<string | null>(null);

  useEffect(() => {
    client.setCallbacks({
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
