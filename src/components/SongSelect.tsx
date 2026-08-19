import type { Chart } from '../engine/types';
import { SONGS } from '../data/songs';

interface Props {
  onSelect: (chart: Chart) => void;
  onBack: () => void;
}

export function SongSelect({ onSelect, onBack }: Props) {
  return (
    <div className="screen song-select-screen">
      <h2>곡 선택</h2>
      <ul className="song-list">
        {SONGS.map((song) => (
          <li key={song.id} className="song-item">
            <button type="button" className="song-button" onClick={() => onSelect(song)}>
              <span className="song-title">{song.title}</span>
              <span className="song-meta">
                {song.artist} · BPM {song.bpm} · {song.notes.length} notes
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary-button" onClick={onBack}>
        뒤로
      </button>
    </div>
  );
}
