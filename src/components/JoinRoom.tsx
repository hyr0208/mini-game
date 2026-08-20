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
      <div className="lobby-topline"><span className="brand-lockup"><span className="brand-mark">✦</span> PLAYLOOP</span><span className="live-pill"><span /> JOIN MODE</span></div>
      <div className="section-heading"><span className="eyebrow">JOIN THE PARTY</span><h2>코드만 입력하면 끝</h2><p className="subtitle">친구에게 받은 방 코드와 플레이어 이름을 입력하세요.</p></div>
      <label className="field-label" htmlFor="room-code">방 코드</label>
      <input
        id="room-code"
        className="text-input"
        placeholder="방 코드 (예: 84TT)"
        value={roomCode}
        onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
        maxLength={4}
      />
      <label className="field-label" htmlFor="player-name">플레이어 이름</label>
      <input
        id="player-name"
        className="text-input"
        placeholder="이름"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={12}
      />
      {error && <p className="error-text">{error}</p>}
      <button type="button" className="primary-button" onClick={handleJoin} disabled={connecting}>
        {connecting ? '연결 중...' : '게임에 참가'} <span>↗</span>
      </button>
      <button type="button" className="secondary-button" onClick={onBack}>
        뒤로
      </button>
    </div>
  );
}
