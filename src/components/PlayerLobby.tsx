import type { PlayerInfo } from '../net/protocol';
import { GAME_LABEL } from '../minigames/types';

interface Props {
  roomCode: string;
  players: PlayerInfo[];
  myPlayerId: string;
}

/**
 * players/roomCode는 App이 방 참가 시점에 한 번 등록한 콜백으로 채워지는 값을 그대로
 * 전달받는 순수 표시용 컴포넌트다. 라운드 시작 감지·방 종료 처리도 모두 App 레벨에서
 * (세션 화면으로 전환되기 전에) 등록되므로 이 화면은 아무 콜백도 등록하지 않는다.
 */
export function PlayerLobby({ roomCode, players, myPlayerId }: Props) {
  return (
    <div className="screen player-lobby-screen">
      <h2>대기실</h2>
      <div className="room-code">{roomCode}</div>
      <p className="subtitle">호스트가 미니게임 나이트를 시작하길 기다리는 중...</p>
      <p className="subtitle">
        {GAME_LABEL.buttonMash} · {GAME_LABEL.simonSays} · {GAME_LABEL.aimClick}
      </p>

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
