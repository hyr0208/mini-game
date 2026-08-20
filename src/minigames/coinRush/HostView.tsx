import { useMemo } from 'react';
import { useRoundClock } from '../useRoundClock';
import { COIN_LANE_INTERVAL_MS, COIN_LANE_PATTERN, COIN_RUSH_DURATION_MS } from '../constants';
import { CharacterAvatar } from '../CharacterAvatar';
import type { PlayerInfo } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  players: PlayerInfo[];
}

export function CoinRushHostView({ getNow, startAnchorServerTime, players }: Props) {
  const elapsedMs = useRoundClock(getNow, startAnchorServerTime);
  const remainingMs = Math.max(0, COIN_RUSH_DURATION_MS - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const active = elapsedMs >= 0 && elapsedMs < COIN_RUSH_DURATION_MS;
  const progress = Math.min(1, Math.max(0, elapsedMs / COIN_RUSH_DURATION_MS));
  const targetLane = active
    ? COIN_LANE_PATTERN[Math.floor(elapsedMs / COIN_LANE_INTERVAL_MS) % COIN_LANE_PATTERN.length]
    : -1;
  const participants = useMemo(
    () => [
      ...players.map((player) => ({ id: player.id, name: player.name, color: player.color })),
      ...Array.from({ length: Math.max(0, 4 - players.length) }, (_, index) => ({
        id: `coin-cpu-${index}`,
        name: `CPU ${index + 1}`,
        color: ['#5dd6ff', '#8bff5d', '#ffd15d', '#ff5d8f'][index],
      })),
    ],
    [players],
  );

  const coinPositions = useMemo(
    () => [
      { left: '12%', top: '18%', delay: '0s' },
      { left: '78%', top: '18%', delay: '0.7s' },
      { left: '21%', top: '65%', delay: '1.2s' },
      { left: '74%', top: '68%', delay: '0.35s' },
      { left: '50%', top: '10%', delay: '1.8s' },
    ],
    [],
  );

  return (
    <div className="minigame-host-view coin-host-view">
      <div className="game-kicker"><span className="kicker-dot" /> BONUS ROUND</div>
      <h2 className="minigame-title">코인 러시</h2>
      <p className="minigame-instruction">누가 가장 빠르게 손가락을 움직일까요?</p>

      <div className="coin-stage" aria-label="코인 러시 공유 무대">
        <div className="coin-stage-glow" />
        {coinPositions.map((coin, index) => (
          <span
            key={index}
            className="floating-coin"
            style={{ left: coin.left, top: coin.top, animationDelay: coin.delay }}
          >
            ✦
          </span>
        ))}
        <div className="coin-pile">
          <span className="coin-symbol">¢</span>
          <span className="coin-pile-label">COLLECT!</span>
        </div>
        <div className="coin-progress-track">
          <div className="coin-progress-fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      <div className="coin-host-lanes">
        {['LEFT', 'CENTER', 'RIGHT'].map((label, lane) => (
          <div className={`coin-host-lane ${targetLane === lane ? 'is-target' : ''}`} key={label}>
            <span>{targetLane === lane ? '🪙' : '💣'}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className={`coin-character-scene ${active ? 'is-rushing' : ''}`}>
        {participants.map((participant, index) => (
          <CharacterAvatar
            key={participant.id}
            name={participant.name}
            color={participant.color}
            size={48}
            mood={active ? 'happy' : 'idle'}
            active={active && index === 0}
          />
        ))}
      </div>

      {elapsedMs < 0 && <div className="minigame-countdown">{Math.ceil(-elapsedMs / 1000)}</div>}
      {active && <div className="coin-timer"><strong>{String(remainingSeconds).padStart(2, '0')}</strong><span>SEC</span></div>}
      {!active && elapsedMs >= COIN_RUSH_DURATION_MS && <div className="minigame-waiting">집계 중...</div>}

      <div className="coin-player-strip">
        {players.map((player) => (
          <div className="coin-player-chip" key={player.id}>
            <span className="player-dot" style={{ background: player.color }} />
            <span>{player.name}</span>
          </div>
        ))}
        {players.length < 4 && <div className="coin-player-chip is-bot"><span className="player-dot" />CPU {4 - players.length}</div>}
      </div>
    </div>
  );
}
