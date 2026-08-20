interface Props {
  name: string;
  color: string;
  mood?: 'idle' | 'happy' | 'sad';
  size?: number;
  active?: boolean;
}

/** 색상 + 얼굴로만 이루어진 오리지널 캐릭터 아바타 (특정 게임 IP를 연상시키지 않는다). */
export function CharacterAvatar({ name, color, mood = 'idle', size = 64, active = false }: Props) {
  return (
    <div className={`character ${active ? 'character-active' : ''}`}>
      <div
        className={`character-body mood-${mood}`}
        style={{ width: size, height: size, background: color }}
      >
        <span className="character-eyes" />
        <span className="character-mouth" />
      </div>
      <span className="character-name">{name}</span>
    </div>
  );
}
