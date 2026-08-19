import { useState } from 'react';
import type { Chart, EngineStats } from './engine/types';
import type { PlayerInfo, PlayerResult as PlayerResultData } from './net/protocol';
import { RoomClient } from './net/RoomClient';
import { WS_URL } from './engine/constants';
import { SONGS } from './data/songs';
import { RoleSelect } from './components/RoleSelect';
import { HostLobby } from './components/HostLobby';
import { HostGameScreen } from './components/HostGameScreen';
import { HostResult } from './components/HostResult';
import { JoinRoom } from './components/JoinRoom';
import { PlayerLobby } from './components/PlayerLobby';
import { PlayerGameScreen } from './components/PlayerGameScreen';
import { PlayerResult } from './components/PlayerResult';
import { SoloSongSelect } from './components/SoloSongSelect';
import { SoloGameScreen } from './components/SoloGameScreen';
import { SoloResult } from './components/SoloResult';
import './App.css';

type Screen =
  | 'role'
  | 'hostLobby'
  | 'hostGame'
  | 'hostResult'
  | 'joinRoom'
  | 'playerLobby'
  | 'playerGame'
  | 'playerResult'
  | 'soloSelect'
  | 'soloGame'
  | 'soloResult';

/**
 * 화면 전환만 담당하는 최상위 컴포넌트. 실제 신호 렌더링/판정은 CueEngine·PlayerEngine이,
 * 방 관리와 시계 동기화는 RoomClient + 서버가 담당한다.
 */
function App() {
  const [client, setClient] = useState(() => new RoomClient());
  const [screen, setScreen] = useState<Screen>('role');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // 호스트 쪽 상태
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roster, setRoster] = useState<PlayerInfo[]>([]);
  const [chart, setChart] = useState<Chart | null>(null);
  const [startAnchor, setStartAnchor] = useState<number | null>(null);
  const [gamePlayers, setGamePlayers] = useState<PlayerInfo[]>([]);
  const [hostResults, setHostResults] = useState<PlayerResultData[] | null>(null);

  // 참가자 쪽 상태
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [playerResults, setPlayerResults] = useState<PlayerResultData[] | null>(null);

  // 혼자하기 상태
  const [soloStats, setSoloStats] = useState<EngineStats | null>(null);

  // GameScreen을 강제로 새로 마운트시켜 라운드마다 엔진을 새로 만들기 위한 키
  const [runId, setRunId] = useState(0);

  const resetToRole = () => {
    client.leaveRoom();
    client.disconnect();
    setClient(new RoomClient());
    setRoomCode(null);
    setRoster([]);
    setChart(null);
    setStartAnchor(null);
    setGamePlayers([]);
    setHostResults(null);
    setMyPlayerId(null);
    setPlayerResults(null);
    setSoloStats(null);
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
        <RoleSelect
          onHost={goHost}
          onJoin={goJoin}
          onSolo={() => setScreen('soloSelect')}
          connecting={connecting}
          error={connectError}
        />
      )}

      {screen === 'soloSelect' && (
        <SoloSongSelect
          onSelect={(selectedChart) => {
            setChart(selectedChart);
            setRunId((id) => id + 1);
            setScreen('soloGame');
          }}
          onBack={() => setScreen('role')}
        />
      )}

      {screen === 'soloGame' && chart && (
        <SoloGameScreen
          key={runId}
          chart={chart}
          onFinish={(stats) => {
            setSoloStats(stats);
            setScreen('soloResult');
          }}
        />
      )}

      {screen === 'soloResult' && soloStats && (
        <SoloResult
          stats={soloStats}
          onRetry={() => {
            setRunId((id) => id + 1);
            setScreen('soloGame');
          }}
          onExit={() => setScreen('role')}
        />
      )}

      {screen === 'hostLobby' && (
        <HostLobby
          client={client}
          roomCode={roomCode}
          players={roster}
          onStart={(selectedChart, anchor, players) => {
            setChart(selectedChart);
            setStartAnchor(anchor);
            setGamePlayers(players);
            setRunId((id) => id + 1);
            setScreen('hostGame');
          }}
          onExit={resetToRole}
        />
      )}

      {screen === 'hostGame' && chart && startAnchor !== null && (
        <HostGameScreen
          key={runId}
          client={client}
          chart={chart}
          startAnchorServerTime={startAnchor}
          initialPlayers={gamePlayers}
          onFinish={(results) => {
            setHostResults(results);
            setScreen('hostResult');
          }}
        />
      )}

      {screen === 'hostResult' && hostResults && (
        <HostResult
          results={hostResults}
          onPlayAgain={() => setScreen('hostLobby')}
          onExit={resetToRole}
        />
      )}

      {screen === 'joinRoom' && (
        <JoinRoom
          client={client}
          onJoined={(code, playerId) => {
            client.setCallbacks({ onPlayerList: (list) => setRoster(list) });
            setRoomCode(code);
            setMyPlayerId(playerId);
            setScreen('playerLobby');
          }}
          onBack={resetToRole}
        />
      )}

      {screen === 'playerLobby' && roomCode && myPlayerId && (
        <PlayerLobby
          client={client}
          roomCode={roomCode}
          players={roster}
          myPlayerId={myPlayerId}
          onGameStarting={(chartId, anchor) => {
            const selectedChart = SONGS.find((song) => song.id === chartId);
            if (!selectedChart) return;
            setChart(selectedChart);
            setStartAnchor(anchor);
            setRunId((id) => id + 1);
            setScreen('playerGame');
          }}
          onRoomClosed={() => resetToRole()}
        />
      )}

      {screen === 'playerGame' && chart && startAnchor !== null && myPlayerId && (
        <PlayerGameScreen
          key={runId}
          client={client}
          chart={chart}
          startAnchorServerTime={startAnchor}
          roster={roster}
          myPlayerId={myPlayerId}
          onRoundFinished={(results) => {
            setPlayerResults(results);
            setScreen('playerResult');
          }}
        />
      )}

      {screen === 'playerResult' && myPlayerId && (
        <PlayerResult
          client={client}
          results={playerResults ?? []}
          myPlayerId={myPlayerId}
          onGameStarting={(chartId, anchor) => {
            const selectedChart = SONGS.find((song) => song.id === chartId);
            if (!selectedChart) return;
            setChart(selectedChart);
            setStartAnchor(anchor);
            setRunId((id) => id + 1);
            setScreen('playerGame');
          }}
          onLeave={resetToRole}
        />
      )}
    </div>
  );
}

export default App;
