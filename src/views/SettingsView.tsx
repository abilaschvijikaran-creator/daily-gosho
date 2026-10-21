import { useState } from 'react';
import { clearPersonalData, saveGoals, type StorageLike } from '../lib/storage';

interface SettingsViewProps {
  store: StorageLike | null;
  goals: string;
  onGoalsChange: (goals: string) => void;
  onClearAll: () => void;
}

/** Personal goals (used to tailor the reflection) and the controls for deleting local data. */
export function SettingsView({ store, goals, onGoalsChange, onClearAll }: SettingsViewProps) {
  const [draft, setDraft] = useState(goals);
  const [status, setStatus] = useState('');

  function handleSaveGoals() {
    const trimmed = draft.trim().slice(0, 1000);
    const ok = saveGoals(store, trimmed);
    if (ok) onGoalsChange(trimmed);
    setStatus(ok ? 'Goals saved on this device.' : 'Could not save. Storage may be blocked or full.');
  }

  function handleClear() {
    const confirmed = window.confirm(
      'Delete all personal data stored by Daily Gosho on this device? This removes favourites, journal entries, goals and the archive. It cannot be undone.',
    );
    if (!confirmed) return;
    const ok = clearPersonalData(store);
    if (ok) {
      setDraft('');
      onClearAll();
      setStatus('All personal data on this device has been deleted.');
    } else {
      setStatus('Could not clear data. Storage may be blocked. Try again after reloading the app.');
    }
  }

  return (
    <div className="stack">
      <h1>Settings</h1>

      <section className="card">
        <h2>My goals and challenges</h2>
        <p className="note">
          Optional. Anything you write here is used only to add your own goal to the personal application and
          action on the Today screen. The app does not know your circumstances beyond what you type. Stored on this
          device only.
        </p>
        <label className="field">
          <span>Goals or challenges (up to 1000 characters)</span>
          <textarea
            rows={4}
            value={draft}
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="button" className="button primary" onClick={handleSaveGoals}>
            Save goals
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Your data on this device</h2>
        <p className="note">
          Favourites, journal entries, goals and the archive are stored in this browser only. Nothing is sent to any
          server. Clearing removes them from this device.
        </p>
        <button type="button" className="button danger" onClick={handleClear}>
          Delete all personal data on this device
        </button>
      </section>

      <p className="copy-feedback" role="status" aria-live="polite">
        {status}
      </p>

      <section className="card">
        <h2>About the sources</h2>
        <ul className="small">
          <li>
            Ikeda Sensei’s daily encouragement: Soka Gakkai Global (official). Attribution is shown on each passage.
          </li>
          <li>
            Nichiren Daishonin passage: a secondary blog (Brilliant Brent East SGI). The app labels it as secondary.
          </li>
          <li>Reflections are generated from templates on this device. They are not produced by a live AI service.</li>
        </ul>
      </section>
    </div>
  );
}
