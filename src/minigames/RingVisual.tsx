const TARGET_RADIUS = 50;
const MAX_RADIUS = 150;

interface Props {
  /** 0 = 방금 등장(가장 큼), 1 = 목표 크기에 도달(=판정 타이밍) */
  progress: number;
  color?: string;
}

/** 목표 링으로 줄어드는 공유 타이밍 신호. 호스트/참가자 화면에서 공통으로 쓴다. */
export function RingVisual({ progress, color = 'rgba(255,255,255,0.9)' }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = MAX_RADIUS - clamped * (MAX_RADIUS - TARGET_RADIUS);

  return (
    <div className="ring-visual">
      <div className="ring-target" />
      <div
        className="ring-outer"
        style={{ width: radius * 2, height: radius * 2, borderColor: color }}
      />
    </div>
  );
}
