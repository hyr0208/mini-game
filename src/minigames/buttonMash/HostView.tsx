import { TimedRoundHostView } from '../TimedRoundHostView';
import { BUTTON_MASH_DURATION_MS } from '../constants';
import { GAME_DESC, GAME_LABEL } from '../types';
import type { PlayerInfo } from '../../net/protocol';

interface Props {
  getNow: () => number;
  startAnchorServerTime: number;
  players: PlayerInfo[];
  liveScores: Record<string, number>;
}

export function ButtonMashHostView(props: Props) {
  return (
    <TimedRoundHostView
      {...props}
      title={GAME_LABEL.buttonMash}
      description={GAME_DESC.buttonMash}
      durationMs={BUTTON_MASH_DURATION_MS}
    />
  );
}
