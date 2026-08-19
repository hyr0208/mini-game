interface Props {
  onHost: () => void;
  onJoin: () => void;
  onSolo: () => void;
  connecting: boolean;
  error: string | null;
}

export function RoleSelect({ onHost, onJoin, onSolo, connecting, error }: Props) {
  return (
    <div className="screen menu-screen">
      <div className="menu-hero">
        <div className="menu-hero-ring menu-hero-ring-outer" />
        <div className="menu-hero-ring menu-hero-ring-inner" />
        <h1 className="title">RHYTHM</h1>
      </div>
      <p className="subtitle">혼자서도, 다같이 폰으로 모여서도 즐길 수 있어요</p>

      <div className="role-cards">
        <button type="button" className="role-card role-card-solo" onClick={onSolo} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="currentColor" />
            </svg>
          </span>
          <span className="role-card-body">
            <span className="role-card-title">혼자하기</span>
            <span className="role-card-desc">이 기기 하나로 바로 시작</span>
          </span>
        </button>

        <button type="button" className="role-card role-card-host" onClick={onHost} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 20.5h8M12 17v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="role-card-body">
            <span className="role-card-title">호스트로 시작</span>
            <span className="role-card-desc">다같이 보는 공유 화면</span>
          </span>
        </button>

        <button type="button" className="role-card role-card-join" onClick={onJoin} disabled={connecting}>
          <span className="role-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="role-card-body">
            <span className="role-card-title">참가하기</span>
            <span className="role-card-desc">여럿이 할 때, 내 기기로 플레이</span>
          </span>
        </button>
      </div>

      {connecting && <p className="subtitle">서버에 연결하는 중...</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
