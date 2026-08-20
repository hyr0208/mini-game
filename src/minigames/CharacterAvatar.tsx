import type { CSSProperties } from 'react';

interface Props {
  name: string;
  color: string;
  mood?: 'idle' | 'happy' | 'sad';
  size?: number;
  active?: boolean;
}

/** 작은 몸짓과 표정으로 게임 상태를 보여주는 오리지널 캐릭터 아바타. */
export function CharacterAvatar({ name, color, mood = 'idle', size = 64, active = false }: Props) {
  return (
    <div className={`character ${active ? 'character-active' : ''}`}>
      <div
        className={`character-body mood-${mood}`}
        style={{
          width: size,
          height: size,
          background: color,
          '--character-color': color,
        } as CSSProperties}
      >
        <span className="character-aura" />
        <span className="character-arm character-arm-left" />
        <span className="character-arm character-arm-right" />
        <span className="character-foot character-foot-left" />
        <span className="character-foot character-foot-right" />
        <span className="character-face">
          <span className="character-eyes">
            <i className="character-eye character-eye-left" />
            <i className="character-eye character-eye-right" />
          </span>
          <span className="character-mouth" />
        </span>
        <span className="character-spark" aria-hidden="true">✦</span>
      </div>
      <span className="character-name">{name}</span>
    </div>
  );
}
