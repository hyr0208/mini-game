import { SONGS } from '../data/songs';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SongPicker({ selectedId, onSelect }: Props) {
  return (
    <div className="song-list">
      {SONGS.map((song) => (
        <button
          key={song.id}
          type="button"
          className={`song-button ${selectedId === song.id ? 'active' : ''}`}
          onClick={() => onSelect(song.id)}
        >
          <span className="song-title">{song.title}</span>
          <span className="song-meta">
            {song.artist} · BPM {song.bpm}
          </span>
        </button>
      ))}
    </div>
  );
}
