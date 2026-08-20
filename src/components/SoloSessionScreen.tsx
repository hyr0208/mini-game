import { useEffect, useRef, useState } from 'react';
import type {
  BeatPlanEntry,
  GameId,
  RoundResultEntry,
  SessionResultEntry,
  TurnPlanEntry,
} from '../net/protocol';
import { LocalClient } from '../net/LocalClient';
import { createLocalBots, simulateBotDeltaMs, type LocalBot } from '../minigames/localBots';
import {
  BEAT_INTERVAL_MS,
  RELAY_SCORE_TABLE,
  ROUND_LEAD_MS,
  SYNC_SCORE_TABLE,
  TURN_DURATION_MS,
  COIN_RUSH_SCORE_PER_COIN,
  getSyncBeatPattern,
  getSyncBeatTargets,
  judgeFromAbsDeltaMs,
} from '../minigames/constants';
import { TimingRelayHostView } from '../minigames/timingRelay/HostView';
import { TimingRelayPlayerView } from '../minigames/timingRelay/PlayerView';
import { SyncBuildHostView } from '../minigames/syncBuild/HostView';
import { SyncBuildPlayerView } from '../minigames/syncBuild/PlayerView';
import { CoinRushHostView } from '../minigames/coinRush/HostView';
import { CoinRushPlayerView } from '../minigames/coinRush/PlayerView';
import { RoundResultBoard } from '../minigames/RoundResultBoard';
import { SessionResultBoard } from '../minigames/SessionResultBoard';

const HUMAN_ID = 'me';
const HUMAN_NAME = '나';
const HUMAN_COLOR = '#ff5d8f';
const ROUND_RESULT_DISPLAY_MS = 3500;

interface Props {
  onExit: () => void;
}

interface RoundData {
  gameId: GameId;
  startAnchorServerTime: number;
  turnPlan?: TurnPlanEntry[];
  myTurnOffsetMs?: number;
  beatCount?: number;
  beatIntervalMs?: number;
  beatIntervalsMs?: number[];
  beatTargets?: number[];
  beatPlan?: BeatPlanEntry[];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 혼자하기 화면. 서버/방 없이 이 기기 하나에서 세션 전체(라운드 진행, 봇 시뮬레이션,
 * 채점)를 처리한다 — 원래 설계대로 이 기기의 시계 하나만으로 타이밍을 맞추면 되므로
 * 네트워크 동기화가 필요 없다. 호스트/참가자 화면 컴포넌트를 그대로 겹쳐 써서
 * "공유 무대"와 "내 입력"을 한 화면에 합친다.
 */
export function SoloSessionScreen({ onExit }: Props) {
  const [subPhase, setSubPhase] = useState<'round' | 'roundResult' | 'sessionFinished'>('round');
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [roundResultEntries, setRoundResultEntries] = useState<RoundResultEntry[] | null>(null);
  const [sessionEntries, setSessionEntries] = useState<SessionResultEntry[] | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);

  const botsRef = useRef<LocalBot[]>(createLocalBots(3, new Set([HUMAN_COLOR])));
  const humanTotalRef = useRef(0);
  const gamesRef = useRef<GameId[]>(shuffle<GameId>(['timingRelay', 'syncBuild', 'coinRush']));
  const roundIndexRef = useRef(-1);
  const roundScoresRef = useRef(new Map<string, number>());
  const finishedRef = useRef(new Set<string>());
  const clientRef = useRef(new LocalClient());

  const finalizeParticipant = (id: string, score: number) => {
    if (finishedRef.current.has(id)) return;
    finishedRef.current.add(id);
    roundScoresRef.current.set(id, score);

    if (id === HUMAN_ID) {
      humanTotalRef.current += score;
    } else {
      const bot = botsRef.current.find((b) => b.id === id);
      if (bot) bot.totalScore += score;
    }
    maybeFinishRound();
  };

  const maybeFinishRound = () => {
    if (finishedRef.current.size < 1 + botsRef.current.length) return;

    const entries: RoundResultEntry[] = [
      {
        playerId: HUMAN_ID,
        name: HUMAN_NAME,
        color: HUMAN_COLOR,
        roundScore: roundScoresRef.current.get(HUMAN_ID) ?? 0,
        totalScore: humanTotalRef.current,
      },
      ...botsRef.current.map((bot) => ({
        playerId: bot.id,
        name: bot.name,
        color: bot.color,
        roundScore: roundScoresRef.current.get(bot.id) ?? 0,
        totalScore: bot.totalScore,
      })),
    ].sort((a, b) => b.totalScore - a.totalScore);

    setRoundResultEntries(entries);
    setSubPhase('roundResult');
    window.setTimeout(startNextRound, ROUND_RESULT_DISPLAY_MS);
  };

  const finishSession = () => {
    const entries: SessionResultEntry[] = [
      { playerId: HUMAN_ID, name: HUMAN_NAME, color: HUMAN_COLOR, totalScore: humanTotalRef.current },
      ...botsRef.current.map((bot) => ({
        playerId: bot.id,
        name: bot.name,
        color: bot.color,
        totalScore: bot.totalScore,
      })),
    ].sort((a, b) => b.totalScore - a.totalScore);

    setSessionEntries(entries);
    setSubPhase('sessionFinished');
  };

  const startNextRound = () => {
    roundIndexRef.current += 1;
    setRoundIndex(roundIndexRef.current);
    if (roundIndexRef.current >= gamesRef.current.length) {
      finishSession();
      return;
    }

    const gameId = gamesRef.current[roundIndexRef.current];
    roundScoresRef.current = new Map();
    finishedRef.current = new Set();
    const startAnchorServerTime = Date.now() + ROUND_LEAD_MS;

    if (gameId === 'timingRelay') {
      const participants = [
        { id: HUMAN_ID, name: HUMAN_NAME, color: HUMAN_COLOR, isBot: false as const, skill: 1 },
        ...botsRef.current.map((b) => ({ id: b.id, name: b.name, color: b.color, isBot: true as const, skill: b.skill })),
      ];
      const order = shuffle(participants);
      const plan: TurnPlanEntry[] = order.map((p, index) => {
        const turnStartOffsetMs = index * TURN_DURATION_MS;
        if (!p.isBot) {
          return { participantId: p.id, name: p.name, color: p.color, isBot: false, turnStartOffsetMs };
        }
        const deltaMs = simulateBotDeltaMs(p.skill);
        const judgement = judgeFromAbsDeltaMs(Math.abs(deltaMs));
        return {
          participantId: p.id,
          name: p.name,
          color: p.color,
          isBot: true,
          turnStartOffsetMs,
          botResult: { judgement, deltaMs },
        };
      });

      for (const entry of plan) {
        if (entry.isBot && entry.botResult) {
          finalizeParticipant(entry.participantId, RELAY_SCORE_TABLE[entry.botResult.judgement]);
        }
      }

      const mine = plan.find((e) => e.participantId === HUMAN_ID);
      setRoundData({ gameId, startAnchorServerTime, turnPlan: plan, myTurnOffsetMs: mine?.turnStartOffsetMs ?? 0 });
    } else if (gameId === 'syncBuild') {
      const beatIntervalsMs = getSyncBeatPattern(roundIndexRef.current);
      const beatCount = beatIntervalsMs.length;
      const beatTargets = getSyncBeatTargets(roundIndexRef.current, beatCount);
      const beatPlan: BeatPlanEntry[] = botsRef.current.map((bot) => ({
        participantId: bot.id,
        name: bot.name,
        color: bot.color,
        perBeatJudgement: Array.from({ length: beatCount }, () =>
          judgeFromAbsDeltaMs(Math.abs(simulateBotDeltaMs(bot.skill))),
        ),
      }));

      for (const entry of beatPlan) {
        const score = entry.perBeatJudgement.reduce((sum, j) => sum + SYNC_SCORE_TABLE[j], 0);
        finalizeParticipant(entry.participantId, score);
      }

      setRoundData({
        gameId,
        startAnchorServerTime,
        beatCount,
        beatIntervalMs: BEAT_INTERVAL_MS,
        beatIntervalsMs,
        beatTargets,
        beatPlan,
      });
    } else {
      const participants = [
        { id: HUMAN_ID, name: HUMAN_NAME, color: HUMAN_COLOR, isBot: false as const, skill: 1 },
        ...botsRef.current.map((b) => ({ id: b.id, name: b.name, color: b.color, isBot: true as const, skill: b.skill })),
      ];
      for (const participant of participants) {
        if (!participant.isBot) continue;
        const coins = Math.max(3, Math.round(4 + participant.skill * 7 + (Math.random() - 0.5) * 3));
        finalizeParticipant(participant.id, coins * COIN_RUSH_SCORE_PER_COIN);
      }
      setRoundData({ gameId, startAnchorServerTime });
    }
    setSubPhase('round');
  };

  const startedRef = useRef(false);
  useEffect(() => {
    // StrictMode에서 개발 중 effect가 두 번 호출되는 것을 막는다 — 그렇지 않으면
    // 라운드가 시작 즉시 한 번 더 진행돼버린다.
    if (startedRef.current) return;
    startedRef.current = true;
    clientRef.current.onScore = (score) => finalizeParticipant(HUMAN_ID, score);
    startNextRound();
    // 세션 시작은 마운트 시 한 번만 — 이후 진행은 로컬 타이머/콜백이 스스로 이어간다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getNow = () => clientRef.current.now();
  const totalRounds = gamesRef.current.length;

  if (subPhase === 'round' && roundData) {
    return (
      <div className="screen game-screen host-game-screen solo-session-screen">
        {roundData.gameId === 'timingRelay' && (
          <>
            <TimingRelayHostView
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
              turnPlan={roundData.turnPlan ?? []}
            />
            <TimingRelayPlayerView
              client={clientRef.current}
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
              myTurnOffsetMs={roundData.myTurnOffsetMs ?? 0}
            />
          </>
        )}
        {roundData.gameId === 'syncBuild' && (
          <>
            <SyncBuildHostView
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
              beatCount={roundData.beatCount ?? 0}
              beatIntervalMs={roundData.beatIntervalMs ?? 0}
              beatPlan={roundData.beatPlan ?? []}
              players={[{ id: HUMAN_ID, name: HUMAN_NAME, color: HUMAN_COLOR }]}
            />
            <SyncBuildPlayerView
              client={clientRef.current}
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
            beatCount={roundData.beatCount ?? 0}
            beatIntervalMs={roundData.beatIntervalMs ?? 0}
            beatIntervalsMs={roundData.beatIntervalsMs}
            beatTargets={roundData.beatTargets}
          />
          </>
        )}
        {roundData.gameId === 'coinRush' && (
          <>
            <CoinRushHostView
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
              players={[{ id: HUMAN_ID, name: HUMAN_NAME, color: HUMAN_COLOR }]}
            />
            <CoinRushPlayerView
              client={clientRef.current}
              getNow={getNow}
              startAnchorServerTime={roundData.startAnchorServerTime}
            />
          </>
        )}
        <div className="minigame-round-indicator">
          ROUND {roundIndex + 1} / {totalRounds}
        </div>
      </div>
    );
  }

  if (subPhase === 'roundResult' && roundResultEntries) {
    return (
      <RoundResultBoard
        entries={roundResultEntries}
        myPlayerId={HUMAN_ID}
        roundIndex={roundIndex}
        totalRounds={totalRounds}
      />
    );
  }

  if (subPhase === 'sessionFinished' && sessionEntries) {
    return <SessionResultBoard entries={sessionEntries} myPlayerId={HUMAN_ID} onExit={onExit} />;
  }

  return null;
}
