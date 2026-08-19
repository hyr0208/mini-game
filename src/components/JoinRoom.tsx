import { useState } from 'react';
import type { RoomClient } from '../net/RoomClient';

interface Props {
  client: RoomClient;
  onJoined: (roomCode: string, playerId: string, color: string) => void;
  onBack: () => void;
}

export function JoinRoom({ client, onJoined, onBack }: Props) {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleJoin = () => {
    if (!roomCode.trim() || !name.trim()) {
      setError('방 코드와 이름을 입력해주세요.');
      return;
    }

    setConnecting(true);
    setError(null);
    client.setCallbacks({
      onRoomJoined: (code, playerId, color) => {
        setConnecting(false);
        onJoined(code, playerId, color);
      },
      onError: (message) => {
        setConnecting(false);
        setError(message);
      },
    });
    client.joinRoom(roomCode, name);
  };

  return (
    <div className="screen join-room-screen">
      <h2>참가하기</h2>
      <input
        className="text-input"
        placeholder="방 코드 (예: 84TT)"
        value={roomCode}
        onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
        maxLength={4}
      />
      <input
        className="text-input"
        placeholder="이름"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={12}
      />
      {error && <p className="error-text">{error}</p>}
      <button type="button" className="primary-button" onClick={handleJoin} disabled={connecting}>
        {connecting ? '연결 중...' : '참가하기'}
      </button>
      <button type="button" className="secondary-button" onClick={onBack}>
        뒤로
      </button>
    </div>
  );
}
