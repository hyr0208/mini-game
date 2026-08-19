import type { RoomClient } from '../net/RoomClient';
import type { GameId, PlayerInfo, RoundResultEntry, SessionResultEntry } from '../net/protocol';
import { ButtonMashHostView } from '../minigames/buttonMash/HostView';
import { SimonSaysHostView } from '../minigames/simonSays/HostView';
import { AimClickHostView } from '../minigames/aimClick/HostView';
import { RoundResultBoard } from '../minigames/RoundResultBoard';
import { SessionResultBoard } from '../minigames/SessionResultBoard';

export interface RoundData {
  gameId: GameId;
  roundIndex: number;
  totalRounds: number;
  startAnchorServerTime: number;
  simonSequence?: number[];
}

export type SubPhase = 'round' | 'roundResult' | 'sessionFinished';

interface Props {
  client: RoomClient;
  players: PlayerInfo[];
  subPhase: SubPhase;
  roundData: RoundData | null;
  liveScores: Record<string, number>;
  roundResultEntries: RoundResultEntry[] | null;
  sessionEntries: SessionResultEntry[] | null;
  onPlayAgain: () => void;
  onExit: () => void;
}

/**
 * 호스트(공유 화면)가 세션 하나(여러 라운드) 동안 계속 마운트되어 있는 화면.
 * 라운드/결과 상태는 App이 세션 시작 시점에 한 번 등록한 콜백으로 갱신되는 값을
 * 그대로 전달받아 그리기만 한다 — 이 컴포넌트가 마운트되는 타이밍과 서버 메시지가
 * 도착하는 타이밍 사이에 경쟁이 생기지 않도록, 콜백 등록은 항상 화면 전환보다
 * 먼저 이뤄진다.
 */
export function HostSessionScreen({
  client,
  players,
  subPhase,
  roundData,
  liveScores,
  roundResultEntries,
  sessionEntries,
  onPlayAgain,
  onExit,
}: Props) {
  if (subPhase === 'round' && roundData) {
    return (
      <div className="screen game-screen host-game-screen">
        {roundData.gameId === 'buttonMash' && (
          <ButtonMashHostView
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
            players={players}
            liveScores={liveScores}
          />
        )}
        {roundData.gameId === 'aimClick' && (
          <AimClickHostView
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
            players={players}
            liveScores={liveScores}
          />
        )}
        {roundData.gameId === 'simonSays' && (
          <SimonSaysHostView
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
            sequence={roundData.simonSequence ?? []}
          />
        )}
        <div className="minigame-round-indicator">
          ROUND {roundData.roundIndex + 1} / {roundData.totalRounds}
        </div>
      </div>
    );
  }

  if (subPhase === 'roundResult' && roundResultEntries && roundData) {
    return (
      <RoundResultBoard
        entries={roundResultEntries}
        roundIndex={roundData.roundIndex}
        totalRounds={roundData.totalRounds}
      />
    );
  }

  if (subPhase === 'sessionFinished' && sessionEntries) {
    return <SessionResultBoard entries={sessionEntries} onPlayAgain={onPlayAgain} onExit={onExit} />;
  }

  return (
    <div className="screen">
      <h2>시작하는 중...</h2>
    </div>
  );
}
