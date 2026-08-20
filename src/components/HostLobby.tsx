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
      <div className="lobby-topline"><span className="brand-lockup"><span className="brand-mark">✦</span> PLAYLOOP</span><span className="live-pill"><span /> HOST MODE</span></div>
      <div className="section-heading"><span className="eyebrow">ROOM READY</span><h2>친구를 초대하세요</h2><p className="subtitle">아래 코드를 공유하면 바로 같은 게임에 들어와요.</p></div>
      {roomCode ? <div className="room-code"><span>ROOM CODE</span>{roomCode}</div> : <p className="subtitle">방 만드는 중...</p>}

      <ul className="player-key-list">
        {players.length === 0 && <li className="player-key-item">아직 참가자가 없어요</li>}
        {players.map((player) => (
          <li key={player.id} className="player-key-item">
            <span className="player-dot" style={{ background: player.color }} />
            <span className="player-name">{player.name}</span>
          </li>
        ))}
        {players.length > 0 && players.length < 4 && (
          <li className="player-key-item bot-fill-note">
            + 봇 {4 - players.length}명이 나머지 자리를 채워요
          </li>
        )}
      </ul>

      <div className="lobby-deck"><span className="eyebrow">TONIGHT'S DECK</span><strong>{GAME_LABEL.timingRelay} · {GAME_LABEL.syncBuild} · 코인 러시</strong><small>3 라운드가 랜덤 순서로 이어져요</small></div>

      {error && <p className="error-text">{error}</p>}

      <button type="button" className="primary-button" onClick={handleStart}>
        게임 시작 <span>↗</span>
      </button>
      <button type="button" className="secondary-button" onClick={onExit}>
        나가기
      </button>
    </div>
  );
}
