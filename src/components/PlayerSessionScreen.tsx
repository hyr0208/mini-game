import type { ScoreReporter } from '../net/ScoreReporter';
import type { RoundResultEntry, SessionResultEntry } from '../net/protocol';
import { TimingRelayPlayerView } from '../minigames/timingRelay/PlayerView';
import { SyncBuildPlayerView } from '../minigames/syncBuild/PlayerView';
import { CoinRushPlayerView } from '../minigames/coinRush/PlayerView';
import { RoundResultBoard } from '../minigames/RoundResultBoard';
import { SessionResultBoard } from '../minigames/SessionResultBoard';
import type { RoundData, SubPhase } from './HostSessionScreen';

interface Props {
  client: ScoreReporter;
  myPlayerId: string;
  subPhase: SubPhase;
  roundData: (RoundData & { myTurnOffsetMs?: number }) | null;
  roundResultEntries: RoundResultEntry[] | null;
  sessionEntries: SessionResultEntry[] | null;
  onExit: () => void;
}

/**
 * 참가자 자신의 기기 화면. 세션(여러 라운드) 동안 계속 마운트되어 있으며,
 * 라운드/결과 상태는 App이 방 참가 시점에 한 번 등록한 콜백으로 갱신되는 값을
 * 그대로 전달받아 그리기만 한다 (HostSessionScreen과 같은 이유).
 */
export function PlayerSessionScreen({
  client,
  myPlayerId,
  subPhase,
  roundData,
  roundResultEntries,
  sessionEntries,
  onExit,
}: Props) {
  if (subPhase === 'round' && roundData) {
    return (
      <div className="screen player-game-screen">
        {roundData.gameId === 'timingRelay' && (
          <TimingRelayPlayerView
            client={client}
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
            myTurnOffsetMs={roundData.myTurnOffsetMs ?? 0}
          />
        )}
        {roundData.gameId === 'syncBuild' && (
          <SyncBuildPlayerView
            client={client}
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
            beatCount={roundData.beatCount ?? 0}
            beatIntervalMs={roundData.beatIntervalMs ?? 0}
            beatIntervalsMs={roundData.beatIntervalsMs}
            beatTargets={roundData.beatTargets}
          />
        )}
        {roundData.gameId === 'coinRush' && (
          <CoinRushPlayerView
            client={client}
            getNow={() => client.now()}
            startAnchorServerTime={roundData.startAnchorServerTime}
          />
        )}
      </div>
    );
  }

  if (subPhase === 'roundResult' && roundResultEntries && roundData) {
    return (
      <RoundResultBoard
        entries={roundResultEntries}
        myPlayerId={myPlayerId}
        roundIndex={roundData.roundIndex}
        totalRounds={roundData.totalRounds}
      />
    );
  }

  if (subPhase === 'sessionFinished' && sessionEntries) {
    return <SessionResultBoard entries={sessionEntries} myPlayerId={myPlayerId} onExit={onExit} />;
  }

  return (
    <div className="screen">
      <h2>대기 중</h2>
      <p className="subtitle">호스트가 미니게임 나이트를 시작하길 기다리는 중...</p>
    </div>
  );
}
