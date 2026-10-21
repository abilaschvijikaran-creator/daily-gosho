import type { Favourite } from '../lib/storage';
import { formatDateTime } from '../lib/present';
import { hasUsablePassage } from '../sources/types';
import { CopyButton } from '../components/CopyButton';

interface FavouritesViewProps {
  favourites: Favourite[];
  onChange: (favourites: Favourite[]) => void;
}

/** Passages the reader chose to keep. Each one keeps its source, date and status. */
export function FavouritesView({ favourites, onChange }: FavouritesViewProps) {
  if (favourites.length === 0) {
    return (
      <div className="stack">
        <h1>Favourites</h1>
        <p className="muted">
          Use “Save to favourites” under a passage on the Today screen. Favourites are kept only on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Favourites</h1>
      <ul className="list">
        {favourites.map((favourite) => {
          const { result } = favourite;
          const passage = hasUsablePassage(result) ? result.passage : undefined;
          const text = passage
            ? `“${passage.text}”\n— ${passage.attribution}${passage.reference ? `\n${passage.reference}` : ''}\nSource: ${result.pageUrl}`
            : '';
          return (
            <li key={favourite.id} className="card">
              <p className="small muted">
                {result.sourceName} · {result.requestedDate} · saved {formatDateTime(favourite.savedAt)}
              </p>
              {passage && <blockquote>{passage.text}</blockquote>}
              {passage?.reference && <p className="small">{passage.reference}</p>}
              <p className="small">
                <a href={result.pageUrl} target="_blank" rel="noopener noreferrer">
                  Source page
                </a>
              </p>
              <div className="button-row">
                {passage && <CopyButton label="Copy passage" getText={() => text} />}
                <button
                  type="button"
                  className="button text danger"
                  onClick={() => onChange(favourites.filter((item) => item.id !== favourite.id))}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
