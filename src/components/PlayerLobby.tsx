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
      <div className="lobby-topline"><span className="brand-lockup"><span className="brand-mark">✦</span> PLAYLOOP</span><span className="live-pill"><span /> PLAYER MODE</span></div>
      <div className="section-heading"><span className="eyebrow">YOU'RE IN</span><h2>게임이 곧 시작돼요</h2><p className="subtitle">호스트가 시작 버튼을 누르면 첫 라운드가 열립니다.</p></div>
      <div className="room-code">{roomCode}</div>
      <div className="lobby-deck"><span className="eyebrow">TONIGHT'S DECK</span><strong>{GAME_LABEL.timingRelay} · {GAME_LABEL.syncBuild} · 코인 러시</strong><small>3 라운드 · 행운을 빌어요!</small></div>

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
