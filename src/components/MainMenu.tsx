interface Props {
  onStart: () => void;
}

export function MainMenu({ onStart }: Props) {
  return (
    <div className="screen menu-screen">
      <h1 className="title">RHYTHM</h1>
      <p className="subtitle">Canvas 2D + Web Audio 기반 리듬 게임</p>
      <button type="button" className="primary-button" onClick={onStart}>
        시작하기
      </button>
    </div>
  );
}
