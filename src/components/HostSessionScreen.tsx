import type {
  BeatPlanEntry,
  GameId,
  PlayerInfo,
  RoundResultEntry,
  SessionResultEntry,
  TurnPlanEntry,
} from '../net/protocol';
import { TimingRelayHostView } from '../minigames/timingRelay/HostView';
import { SyncBuildHostView } from '../minigames/syncBuild/HostView';
import { CoinRushHostView } from '../minigames/coinRush/HostView';
import { RoundResultBoard } from '../minigames/RoundResultBoard';
import { SessionResultBoard } from '../minigames/SessionResultBoard';

export interface RoundData {
  gameId: GameId;
  roundIndex: number;
  totalRounds: number;
  startAnchorServerTime: number;
  turnPlan?: TurnPlanEntry[];
  beatCount?: number;
  beatIntervalMs?: number;
  beatIntervalsMs?: number[];
  beatTargets?: number[];
  beatPlan?: BeatPlanEntry[];
}

export type SubPhase = 'round' | 'roundResult' | 'sessionFinished';

interface Props {
  getNow: () => number;
  players: PlayerInfo[];
  subPhase: SubPhase;
  roundData: RoundData | null;
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
  getNow,
  players,
  subPhase,
  roundData,
  roundResultEntries,
  sessionEntries,
  onPlayAgain,
  onExit,
}: Props) {
  if (subPhase === 'round' && roundData) {
    return (
      <div className="screen game-screen host-game-screen">
        {roundData.gameId === 'timingRelay' && (
          <TimingRelayHostView
            getNow={getNow}
            startAnchorServerTime={roundData.startAnchorServerTime}
            turnPlan={roundData.turnPlan ?? []}
          />
        )}
        {roundData.gameId === 'syncBuild' && (
          <SyncBuildHostView
            getNow={getNow}
            startAnchorServerTime={roundData.startAnchorServerTime}
            beatCount={roundData.beatCount ?? 0}
            beatIntervalMs={roundData.beatIntervalMs ?? 0}
            beatIntervalsMs={roundData.beatIntervalsMs}
            beatTargets={roundData.beatTargets}
            beatPlan={roundData.beatPlan ?? []}
            players={players}
          />
        )}
        {roundData.gameId === 'coinRush' && (
          <CoinRushHostView
            getNow={getNow}
            startAnchorServerTime={roundData.startAnchorServerTime}
            players={players}
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
