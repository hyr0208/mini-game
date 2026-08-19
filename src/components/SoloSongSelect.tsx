import { useState } from 'react';
import type { Chart } from '../engine/types';
import { SONGS } from '../data/songs';
import { SongPicker } from './SongPicker';

interface Props {
  onSelect: (chart: Chart) => void;
  onBack: () => void;
}

export function SoloSongSelect({ onSelect, onBack }: Props) {
  const [selectedId, setSelectedId] = useState<string>(SONGS[0].id);

  return (
    <div className="screen solo-select-screen">
      <h2>혼자하기</h2>
      <p className="subtitle">곡을 고르고 바로 시작해요</p>

      <SongPicker selectedId={selectedId} onSelect={setSelectedId} />

      <button
        type="button"
        className="primary-button"
        onClick={() => {
          const chart = SONGS.find((song) => song.id === selectedId);
          if (chart) onSelect(chart);
        }}
      >
        시작하기
      </button>
      <button type="button" className="secondary-button" onClick={onBack}>
        뒤로
      </button>
    </div>
  );
}
