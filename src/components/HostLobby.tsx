import { useEffect, useState } from 'react';
import type { RoomClient } from '../net/RoomClient';
import type { PlayerInfo } from '../net/protocol';
import { GAME_LABEL } from '../minigames/types';

interface Props {
  client: RoomClient;
  roomCode: string | null;
  players: PlayerInfo[];
  onStart: () => void;
  onExit: () => void;
}

/**
 * roomCode/players는 App에서 방을 만들 때 한 번만 등록한 콜백으로 채워지는 값을 그대로
 * 전달받는다. 여기서 다시 client.createRoom()을 호출하면 다시 이 화면에 올 때마다
 * 새 방이 생겨 기존 참가자와 연결이 끊기므로, 이 화면은 방 생성에 관여하지 않는다.
 */
export function HostLobby({ client, roomCode, players, onStart, onExit }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.setCallbacks({
      onError: (message) => setError(message),
    });
  }, [client]);

  const handleStart = () => {
    if (players.length === 0) {
      setError('아직 참가자가 없어요.');
      return;
    }
    setError(null);
    client.startSession();
    onStart();
  };

  return (
    <div className="screen host-lobby-screen">
      <h2>호스트 대기실</h2>
      {roomCode ? <div className="room-code">{roomCode}</div> : <p className="subtitle">방 만드는 중...</p>}
      <p className="subtitle">다른 기기에서 이 코드로 참가해요 (최대 4명)</p>

      <ul className="player-key-list">
        {players.length === 0 && <li className="player-key-item">아직 참가자가 없어요</li>}
        {players.map((player) => (
          <li key={player.id} className="player-key-item">
            <span className="player-dot" style={{ background: player.color }} />
            <span className="player-name">{player.name}</span>
          </li>
        ))}
      </ul>

      <p className="subtitle">
        {GAME_LABEL.buttonMash} · {GAME_LABEL.simonSays} · {GAME_LABEL.aimClick} — 3판 연속으로 진행돼요
      </p>

      {error && <p className="error-text">{error}</p>}

      <button type="button" className="primary-button" onClick={handleStart}>
        미니게임 나이트 시작
      </button>
      <button type="button" className="secondary-button" onClick={onExit}>
        나가기
      </button>
    </div>
  );
}
