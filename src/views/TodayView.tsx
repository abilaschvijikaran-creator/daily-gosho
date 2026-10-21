import { useEffect, useMemo, useRef, useState } from 'react';
import { formatLondonDate, londonDateFor } from '../lib/london-date';
import { fetchDaily } from '../lib/api';
import { addToArchive, saveArchive, type Favourite, type StorageLike } from '../lib/storage';
import { combineForDisplay, entryToStore } from '../lib/guidance-state';
import { determinationCopyText, readingCopyText, formatDateTime, type ShownSection } from '../lib/present';
import { buildReflection, type Reflection } from '../reflection/engine';
import { hasUsablePassage, type CachedDay, type DailyResponse } from '../sources/types';
import { SourceSection } from '../components/SourceSection';
import { ReflectionCard } from '../components/ReflectionCard';
import { CopyButton } from '../components/CopyButton';

interface TodayViewProps {
  store: StorageLike | null;
  archive: CachedDay[];
  onArchiveChange: (archive: CachedDay[]) => void;
  favourites: Favourite[];
  onFavouritesChange: (favourites: Favourite[]) => void;
  goals: string;
}

type Phase = 'idle' | 'loading' | 'done' | 'failed';

const UNKNOWN_ERROR = 'Something went wrong while getting guidance. Please try again.';

export function favouriteId(section: ShownSection): string {
  const { result } = section;
  return `${result.sourceId}|${result.requestedDate}|${result.passage?.text ?? ''}`;
}

export function TodayView({
  store,
  archive,
  onArchiveChange,
  favourites,
  onFavouritesChange,
  goals,
}: TodayViewProps) {
  const [clock, setClock] = useState(() => londonDateFor());
  const [phase, setPhase] = useState<Phase>('idle');
  const [fresh, setFresh] = useState<DailyResponse | null>(null);
  const [error, setError] = useState<string>('');
  const inFlight = useRef(false);

  // Keep the on-screen London date correct across midnight and when the app returns to the foreground.
  useEffect(() => {
    const refresh = () => setClock(londonDateFor());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const todayIso = clock.iso;
  const todayLabel = formatLondonDate(new Date());
  const cachedForToday = archive.find((item) => item.date === todayIso);

  async function handleGetGuidance() {
    if (inFlight.current) return; // Ignore rapid repeat taps while a request is running.
    inFlight.current = true;

    // Recalculate the date at the moment of the tap, in London time.
    const date = londonDateFor();
    setClock(date);
    setPhase('loading');
    setError('');

    try {
      const response = await fetchDaily(date.iso);
      if (response.requestedDate !== date.iso) {
        throw new Error(`The service returned guidance for ${response.requestedDate}, not ${date.iso}.`);
      }
      setFresh(response);

      const cached = archive.find((item) => item.date === date.iso);
      const entry = entryToStore(response, cached);
      if (entry) {
        const next = addToArchive(archive, entry);
        saveArchive(store, next);
        onArchiveChange(next);
      }
      setPhase('done');
    } catch (cause) {
      setFresh(null);
      setError(cause instanceof Error ? cause.message : UNKNOWN_ERROR);
      setPhase('failed');
    } finally {
      inFlight.current = false;
    }
  }

  const sections = useMemo<{ nichiren: ShownSection | null; ikeda: ShownSection | null }>(() => {
    if (fresh) return combineForDisplay(fresh, cachedForToday);
    if (phase === 'failed' && cachedForToday) {
      return {
        nichiren: cachedSection(cachedForToday, 'nichiren'),
        ikeda: cachedSection(cachedForToday, 'ikeda'),
      };
    }
    return { nichiren: null, ikeda: null };
  }, [fresh, cachedForToday, phase]);

  const reflection = useMemo<Reflection | null>(() => {
    const basis = pickReflectionBasis(sections);
    if (!basis) return null;
    return buildReflection({ passageText: basis.text, date: basis.date, goal: goals });
  }, [sections, goals]);

  const showingCachedOnly = phase === 'failed' && fresh === null && cachedForToday !== undefined;
  const hasAnyResult = sections.nichiren !== null || sections.ikeda !== null;

  function toggleFavourite(section: ShownSection) {
    const id = favouriteId(section);
    const exists = favourites.some((item) => item.id === id);
    const next = exists
      ? favourites.filter((item) => item.id !== id)
      : [{ id, savedAt: new Date().toISOString(), result: section.result }, ...favourites];
    onFavouritesChange(next);
  }

  const isFav = (section: ShownSection | null) =>
    section !== null && hasUsablePassage(section.result) && favourites.some((item) => item.id === favouriteId(section));

  return (
    <div className="stack">
      <header className="today-header">
        <p className="eyebrow">Today in the UK</p>
        <h1 className="date">{todayLabel}</h1>
        <p className="muted small">Europe/London time · {todayIso}</p>
      </header>

      <button
        type="button"
        className="button primary big"
        onClick={handleGetGuidance}
        disabled={phase === 'loading'}
        aria-busy={phase === 'loading'}
      >
        {phase === 'loading' ? 'Getting today’s guidance…' : 'Get Today’s Guidance'}
      </button>

      {phase === 'loading' && (
        <div className="card loading" role="status">
          <p>Checking the sources for {todayIso}. This can take a few seconds.</p>
        </div>
      )}

      {phase === 'failed' && (
        <div className="card failure" role="alert">
          <p>
            <strong>Retrieval failed.</strong> {error}
          </p>
          {showingCachedOnly && cachedForToday && (
            <p className="small">
              A cached copy from {formatDateTime(cachedForToday.retrievedAt)} is shown below. It is not newly
              retrieved or current.
            </p>
          )}
          <button type="button" className="button primary" onClick={handleGetGuidance}>
            Try again
          </button>
        </div>
      )}

      {phase === 'done' && fresh && (
        <div className="card success" role="status">
          <p>
            <strong>Retrieval finished.</strong> Each section below shows its own status. Sections that could not
            be verified are labelled, not filled in.
          </p>
        </div>
      )}

      {hasAnyResult && sections.nichiren && (
        <SourceSection
          heading="1. Today’s Nichiren Daishonin guidance"
          section={sections.nichiren}
          todayIso={todayIso}
          isFavourite={isFav(sections.nichiren)}
          onToggleFavourite={() => toggleFavourite(sections.nichiren as ShownSection)}
        />
      )}

      {hasAnyResult && sections.ikeda && (
        <SourceSection
          heading="2. Ikeda Sensei’s daily encouragement"
          section={sections.ikeda}
          todayIso={todayIso}
          isFavourite={isFav(sections.ikeda)}
          onToggleFavourite={() => toggleFavourite(sections.ikeda as ShownSection)}
        />
      )}

      {reflection && (
        <ReflectionCard reflection={reflection} basisLabel={describeBasis(sections)} />
      )}

      {reflection && sections.nichiren && sections.ikeda && (
        <section className="card">
          <h2>Copy</h2>
          <div className="button-row">
            <CopyButton
              label="Copy today’s determination"
              getText={() => determinationCopyText(reflection, formatLondonDate(new Date()))}
            />
            <CopyButton
              label="Copy the complete daily reading"
              getText={() =>
                readingCopyText({
                  dateLabel: todayLabel,
                  nichiren: sections.nichiren as ShownSection,
                  ikeda: sections.ikeda as ShownSection,
                  reflection,
                  reflectionBasis: describeBasis(sections),
                  todayIso,
                })
              }
            />
          </div>
        </section>
      )}

      {!hasAnyResult && phase === 'idle' && (
        <p className="muted small">
          Tap the button to fetch today’s guidance. Nothing is shown until a fresh retrieval is attempted.
        </p>
      )}
    </div>
  );
}

function cachedSection(cached: CachedDay, key: 'ikeda' | 'nichiren'): ShownSection | null {
  const result = cached.response[key];
  if (!hasUsablePassage(result)) return null;
  return {
    result,
    provenance: 'cached',
    retrievedAt: cached.sectionRetrievedAt?.[key] ?? cached.retrievedAt,
  };
}

/**
 * Chooses which passage the reflection is based on: the official Ikeda passage when
 * usable, otherwise the secondary Nichiren passage. Never mixes the two.
 */
function pickReflectionBasis(sections: { nichiren: ShownSection | null; ikeda: ShownSection | null }) {
  if (sections.ikeda && hasUsablePassage(sections.ikeda.result) && sections.ikeda.result.passage) {
    return { text: sections.ikeda.result.passage.text, date: sections.ikeda.result.requestedDate, from: 'ikeda' as const };
  }
  if (sections.nichiren && hasUsablePassage(sections.nichiren.result) && sections.nichiren.result.passage) {
    return {
      text: sections.nichiren.result.passage.text,
      date: sections.nichiren.result.requestedDate,
      from: 'nichiren' as const,
    };
  }
  return null;
}

function describeBasis(sections: { nichiren: ShownSection | null; ikeda: ShownSection | null }): string {
  const basis = pickReflectionBasis(sections);
  if (!basis) return 'no verified passage';
  if (basis.from === 'ikeda') {
    const cached = sections.ikeda?.provenance === 'cached' ? ', a cached copy' : '';
    return `Daisaku Ikeda’s daily encouragement (official source${cached})`;
  }
  const cached = sections.nichiren?.provenance === 'cached' ? ', a cached copy' : '';
  return `the Nichiren passage from a secondary blog${cached}`;
}
