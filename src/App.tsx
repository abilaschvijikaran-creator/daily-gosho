import { useMemo, useState } from 'react';
import {
  browserStorage,
  loadArchive,
  loadFavourites,
  loadGoals,
  loadJournal,
  saveFavourites,
  saveJournal,
  type Favourite,
} from './lib/storage';
import type { CachedDay } from './sources/types';
import { TodayView } from './views/TodayView';
import { ArchiveView } from './views/ArchiveView';
import { FavouritesView } from './views/FavouritesView';
import { JournalView } from './views/JournalView';
import { SettingsView } from './views/SettingsView';

type Tab = 'today' | 'archive' | 'favourites' | 'journal' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'archive', label: 'Archive' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'journal', label: 'Journal' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const store = useMemo(() => browserStorage(), []);
  const [tab, setTab] = useState<Tab>('today');
  const [archive, setArchive] = useState<CachedDay[]>(() => loadArchive(store));
  const [favourites, setFavourites] = useState<Favourite[]>(() => loadFavourites(store));
  const [journal, setJournal] = useState<Record<string, string>>(() => loadJournal(store));
  const [goals, setGoals] = useState<string>(() => loadGoals(store));
  // Changing this remounts the Today view, so nothing from before a data clear stays on screen.
  const [resetCount, setResetCount] = useState(0);

  function handleClearAll() {
    setArchive([]);
    setFavourites([]);
    setJournal({});
    setGoals('');
    setResetCount((count) => count + 1);
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Daily Gosho</span>
        <nav aria-label="Main">
          <ul className="tabs">
            {TABS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="tab"
                  aria-current={tab === item.id ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="content">
        {tab === 'today' && (
          <TodayView
            key={resetCount}
            store={store}
            archive={archive}
            onArchiveChange={setArchive}
            favourites={favourites}
            onFavouritesChange={(next) => {
              setFavourites(next);
              saveFavourites(store, next);
            }}
            goals={goals}
          />
        )}
        {tab === 'archive' && <ArchiveView archive={archive} />}
        {tab === 'favourites' && (
          <FavouritesView
            favourites={favourites}
            onChange={(next) => {
              setFavourites(next);
              saveFavourites(store, next);
            }}
          />
        )}
        {tab === 'journal' && (
          <JournalView
            store={store}
            journal={journal}
            onChange={(next) => {
              setJournal(next);
              saveJournal(store, next);
            }}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            store={store}
            goals={goals}
            onGoalsChange={setGoals}
            onClearAll={handleClearAll}
          />
        )}
      </main>
    </div>
  );
}
