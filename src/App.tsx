import { useState } from 'react';
import type { Chart, EngineStats } from './engine/types';
import { MainMenu } from './components/MainMenu';
import { SongSelect } from './components/SongSelect';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import './App.css';

type Screen = 'menu' | 'songSelect' | 'playing' | 'result';

/**
 * 화면 전환(메뉴/곡 선택/점수·콤보 UI)만 담당하는 최상위 컴포넌트.
 * 실제 게임 루프와 판정은 GameScreen 내부의 GameEngine이 처리한다.
 */
function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [chart, setChart] = useState<Chart | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);
  // GameScreen을 강제로 새로 마운트시켜 매 플레이마다 GameEngine을 새로 만들기 위한 키
  const [runId, setRunId] = useState(0);

  return (
    <div className="app">
      {screen === 'menu' && <MainMenu onStart={() => setScreen('songSelect')} />}

      {screen === 'songSelect' && (
        <SongSelect
          onSelect={(selected) => {
            setChart(selected);
            setRunId((id) => id + 1);
            setScreen('playing');
          }}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'playing' && chart && (
        <GameScreen
          key={runId}
          chart={chart}
          onFinish={(finishedStats) => {
            setStats(finishedStats);
            setScreen('result');
          }}
        />
      )}

      {screen === 'result' && stats && (
        <ResultScreen
          stats={stats}
          onRetry={() => {
            setRunId((id) => id + 1);
            setScreen('playing');
          }}
          onExit={() => setScreen('songSelect')}
        />
      )}
    </div>
  );
}

export default App;
