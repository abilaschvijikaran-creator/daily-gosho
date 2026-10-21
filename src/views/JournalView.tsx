import { useState } from 'react';
import { londonDateFor } from '../lib/london-date';
import { saveJournal, type StorageLike } from '../lib/storage';

interface JournalViewProps {
  store: StorageLike | null;
  journal: Record<string, string>;
  onChange: (journal: Record<string, string>) => void;
}

const MAX_ENTRY_LENGTH = 5000;

/** A private journal, one entry per London date, stored only on this device. */
export function JournalView({ store, journal, onChange }: JournalViewProps) {
  const todayIso = londonDateFor().iso;
  const [draft, setDraft] = useState(journal[todayIso] ?? '');
  const [status, setStatus] = useState('');

  function handleSave() {
    const next = { ...journal, [todayIso]: draft.slice(0, MAX_ENTRY_LENGTH) };
    if (draft.trim() === '') delete next[todayIso];
    const ok = saveJournal(store, next);
    if (ok) onChange(next);
    setStatus(ok ? 'Saved on this device.' : 'Could not save. Storage may be blocked or full.');
  }

  const past = Object.entries(journal)
    .filter(([date]) => date !== todayIso)
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));

  return (
    <div className="stack">
      <h1>Private journal</h1>
      <p className="note">Entries stay on this device and are never sent to any service.</p>

      <section className="card">
        <h2>Today ({todayIso})</h2>
        <label className="field">
          <span className="sr-only">Journal entry for today</span>
          <textarea
            rows={6}
            value={draft}
            maxLength={MAX_ENTRY_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What did you notice, or what did you do with today’s guidance?"
          />
        </label>
        <div className="button-row">
          <button type="button" className="button primary" onClick={handleSave}>
            Save entry
          </button>
          <span className="copy-feedback" role="status" aria-live="polite">
            {status}
          </span>
        </div>
      </section>

      {past.length > 0 && (
        <section className="stack">
          <h2>Earlier entries</h2>
          {past.map(([date, text]) => (
            <article key={date} className="card">
              <h3>{date}</h3>
              <p className="pre-wrap">{text}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
