import { TimedRoundHostView } from '../TimedRoundHostView';
import { AIM_DURATION_MS } from '../constants';
import { GAME_DESC, GAME_LABEL } from '../types';
import type { PlayerInfo } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  players: PlayerInfo[];
  liveScores: Record<string, number>;
}

export function AimClickHostView(props: Props) {
  return (
    <TimedRoundHostView
      {...props}
      title={GAME_LABEL.aimClick}
      description={GAME_DESC.aimClick}
      durationMs={AIM_DURATION_MS}
    />
  );
}
