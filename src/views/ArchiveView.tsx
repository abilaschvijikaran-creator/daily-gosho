import { useState } from 'react';
import type { CachedDay } from '../sources/types';
import { hasUsablePassage } from '../sources/types';
import { formatDateTime, statusLabel } from '../lib/present';

interface ArchiveViewProps {
  archive: CachedDay[];
}

/** Previously retrieved days stored on this device. Everything here is labelled as cached. */
export function ArchiveView({ archive }: ArchiveViewProps) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  if (archive.length === 0) {
    return (
      <div className="stack">
        <h1>Archive</h1>
        <p className="muted">
          Days you have loaded appear here. Nothing is saved until a retrieval succeeds on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Archive</h1>
      <p className="note">
        These are cached copies from earlier retrievals on this device. They are shown with their original date
        and are not newly retrieved.
      </p>
      <ul className="list">
        {archive.map((day) => {
          const isOpen = openDate === day.date;
          const sections: Array<{ key: 'ikeda' | 'nichiren'; label: string }> = [
            { key: 'nichiren', label: 'Nichiren Daishonin (secondary blog)' },
            { key: 'ikeda', label: 'Ikeda Sensei (official)' },
          ];
          return (
            <li key={day.date} className="card">
              <button
                type="button"
                className="button text"
                aria-expanded={isOpen}
                onClick={() => setOpenDate(isOpen ? null : day.date)}
              >
                {day.date} · cached {formatDateTime(day.retrievedAt)}
              </button>
              {isOpen && (
                <div className="stack">
                  {sections.map(({ key, label }) => {
                    const result = day.response[key];
                    return (
                      <div key={key}>
                        <h3>{label}</h3>
                        {hasUsablePassage(result) && result.passage ? (
                          <>
                            <blockquote>{result.passage.text}</blockquote>
                            <p className="small">— {result.passage.attribution}</p>
                            {result.passage.reference && <p className="small">{result.passage.reference}</p>}
                          </>
                        ) : (
                          <p className="small muted">{statusLabel(result.status)}.</p>
                        )}
                        <p className="small">
                          <a href={result.pageUrl} target="_blank" rel="noopener noreferrer">
                            Source page
                          </a>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
