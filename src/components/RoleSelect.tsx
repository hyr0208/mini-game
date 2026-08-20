interface Props {
  onSolo: () => void;
  onHost: () => void;
  onJoin: () => void;
  connecting: boolean;
  error: string | null;
}

export function RoleSelect({ onSolo, onHost, onJoin, connecting, error }: Props) {
  return (
    <div className="screen menu-screen">
      <div className="menu-topline">
        <span className="brand-lockup"><span className="brand-mark">✦</span> PLAYLOOP</span>
        <span className="live-pill"><span /> LIVE ARCADE</span>
      </div>

      <div className="menu-hero">
        <div className="hero-sticker hero-sticker-yellow">READY?</div>
        <div className="hero-sticker hero-sticker-pink">3 GAMES</div>
        <div className="menu-hero-orbit orbit-one" />
        <div className="menu-hero-orbit orbit-two" />
        <div className="menu-hero-orb"><span>PLAY</span><strong>LOOP</strong></div>
      </div>
      <div className="menu-copy">
        <p className="eyebrow">오늘 밤의 승부는 여기서</p>
        <h1 className="title">누가 제일<br /><em>잘 놀아요?</em></h1>
        <p className="subtitle">혼자서 연습해도, 친구들과 겨뤄도 좋아요.<br />짧고 강한 미니게임 3개가 바로 시작됩니다.</p>
      </div>

      <div className="game-showcase">
        <div className="showcase-heading"><span>오늘의 게임 덱</span><small>3 ROUNDS · 4 PLAYERS</small></div>
        <div className="game-grid">
          <div className="game-card game-card-pink"><span className="game-card-icon">◌</span><strong>타이밍<br />릴레이</strong><small>딱 맞춰 누르기</small></div>
          <div className="game-card game-card-blue"><span className="game-card-icon">▥</span><strong>다같이<br />완성하기</strong><small>박자 맞추기</small></div>
          <div className="game-card game-card-yellow"><span className="game-card-icon">¢</span><strong>코인<br />러시</strong><small>빠르게 탭하기</small></div>
        </div>
      </div>

      <div className="role-cards">
        <button type="button" className="role-card role-card-solo" onClick={onSolo} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">▶</span>
          <span className="role-card-body">
            <span className="role-card-title">바로 플레이</span>
            <span className="role-card-desc">이 기기 하나로 시작 · CPU 3명</span>
          </span>
          <span className="role-card-arrow">↗</span>
        </button>

        <button type="button" className="role-card role-card-host" onClick={onHost} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">▣</span>
          <span className="role-card-body">
            <span className="role-card-title">방 만들기</span>
            <span className="role-card-desc">공유 화면 + 친구 기기로 함께</span>
          </span>
          <span className="role-card-arrow">↗</span>
        </button>

        <button type="button" className="role-card role-card-join" onClick={onJoin} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">＋</span>
          <span className="role-card-body">
            <span className="role-card-title">코드로 참가</span>
            <span className="role-card-desc">친구가 만든 방에 내 기기로 접속</span>
          </span>
          <span className="role-card-arrow">↗</span>
        </button>
      </div>

      {connecting && <p className="subtitle">서버에 연결하는 중...</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
