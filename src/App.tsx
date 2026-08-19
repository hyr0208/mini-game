import { useState } from 'react';
import type { PlayerInfo, RoundResultEntry, SessionResultEntry } from './net/protocol';
import { RoomClient } from './net/RoomClient';
import { WS_URL } from './net/config';
import { RoleSelect } from './components/RoleSelect';
import { HostLobby } from './components/HostLobby';
import { HostSessionScreen, type RoundData, type SubPhase } from './components/HostSessionScreen';
import { JoinRoom } from './components/JoinRoom';
import { PlayerLobby } from './components/PlayerLobby';
import { PlayerSessionScreen } from './components/PlayerSessionScreen';
import './App.css';

type Screen = 'role' | 'hostLobby' | 'hostSession' | 'joinRoom' | 'playerLobby' | 'playerSession';

/**
 * 화면 전환만 담당하는 최상위 컴포넌트. 라운드/결과 관련 RoomClient 콜백은 방을
 * 만들거나 참가하는 시점에 한 번에 등록한다 — 세션 화면이 마운트되는 시점과 서버
 * 메시지가 도착하는 시점 사이에 경쟁이 생기지 않도록, 화면을 전환하기 전에 항상
 * 콜백을 먼저 걸어둔다.
 */
function App() {
  const [client, setClient] = useState(() => new RoomClient());
  const [screen, setScreen] = useState<Screen>('role');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roster, setRoster] = useState<PlayerInfo[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  // 라운드/결과 상태 (호스트·참가자 화면이 공유)
  const [subPhase, setSubPhase] = useState<SubPhase>('round');
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});
  const [roundResultEntries, setRoundResultEntries] = useState<RoundResultEntry[] | null>(null);
  const [sessionEntries, setSessionEntries] = useState<SessionResultEntry[] | null>(null);

  const resetToRole = () => {
    client.leaveRoom();
    client.disconnect();
    setClient(new RoomClient());
    setRoomCode(null);
    setRoster([]);
    setMyPlayerId(null);
    setRoundData(null);
    setRoundResultEntries(null);
    setSessionEntries(null);
    setScreen('role');
  };

  const goHost = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await client.connect(WS_URL);
      client.setCallbacks({
        onRoomCreated: (code) => setRoomCode(code),
        onPlayerList: (list) => setRoster(list),
        onRoundStarting: (gameId, roundIndex, totalRounds, startAnchorServerTime, simonSequence) => {
          setLiveScores({});
          setRoundData({ gameId, roundIndex, totalRounds, startAnchorServerTime, simonSequence });
          setSubPhase('round');
        },
        onRoundLiveUpdate: (playerId, score) => {
          setLiveScores((prev) => ({ ...prev, [playerId]: score }));
        },
        onRoundResult: (entries) => {
          setRoundResultEntries(entries);
          setSubPhase('roundResult');
        },
        onSessionFinished: (entries) => {
          setSessionEntries(entries);
          setSubPhase('sessionFinished');
        },
      });
      client.createRoom();
      setScreen('hostLobby');
    } catch {
      setConnectError('서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해주세요.');
    } finally {
      setConnecting(false);
    }
  };

  const goJoin = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await client.connect(WS_URL);
      setScreen('joinRoom');
    } catch {
      setConnectError('서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해주세요.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="app">
      {screen === 'role' && (
        <RoleSelect onHost={goHost} onJoin={goJoin} connecting={connecting} error={connectError} />
      )}

      {screen === 'hostLobby' && (
        <HostLobby
          client={client}
          roomCode={roomCode}
          players={roster}
          onStart={() => {
            client.startSession();
            setScreen('hostSession');
          }}
          onExit={resetToRole}
        />
      )}

      {screen === 'hostSession' && (
        <HostSessionScreen
          client={client}
          players={roster}
          subPhase={subPhase}
          roundData={roundData}
          liveScores={liveScores}
          roundResultEntries={roundResultEntries}
          sessionEntries={sessionEntries}
          onPlayAgain={() => setScreen('hostLobby')}
          onExit={resetToRole}
        />
      )}

      {screen === 'joinRoom' && (
        <JoinRoom
          client={client}
          onJoined={(code, playerId) => {
            client.setCallbacks({
              onPlayerList: (list) => setRoster(list),
              onRoundStarting: (gameId, roundIndex, totalRounds, startAnchorServerTime) => {
                setRoundData({ gameId, roundIndex, totalRounds, startAnchorServerTime });
                setSubPhase('round');
                setScreen('playerSession');
              },
              onRoundResult: (entries) => {
                setRoundResultEntries(entries);
                setSubPhase('roundResult');
              },
              onSessionFinished: (entries) => {
                setSessionEntries(entries);
                setSubPhase('sessionFinished');
              },
              onRoomClosed: () => resetToRole(),
            });
            setRoomCode(code);
            setMyPlayerId(playerId);
            setScreen('playerLobby');
          }}
          onBack={resetToRole}
        />
      )}

      {screen === 'playerLobby' && roomCode && myPlayerId && (
        <PlayerLobby roomCode={roomCode} players={roster} myPlayerId={myPlayerId} />
      )}

      {screen === 'playerSession' && myPlayerId && (
        <PlayerSessionScreen
          client={client}
          myPlayerId={myPlayerId}
          subPhase={subPhase}
          roundData={roundData}
          roundResultEntries={roundResultEntries}
          sessionEntries={sessionEntries}
          onExit={resetToRole}
        />
      )}
    </div>
  );
}

export default App;
