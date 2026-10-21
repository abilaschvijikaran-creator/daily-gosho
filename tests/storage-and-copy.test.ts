import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KEYS,
  clearPersonalData,
  loadFavourites,
  loadGoals,
  loadJournal,
  saveFavourites,
  saveGoals,
  saveJournal,
  type Favourite,
  type StorageLike,
} from '../src/lib/storage';
import { copyText } from '../src/lib/clipboard';
import { readingCopyText, determinationCopyText, provenanceLine, type ShownSection } from '../src/lib/present';
import { buildReflection } from '../src/reflection/engine';

/** An in-memory stand-in for localStorage, so tests never touch the real browser store. */
function memoryStore(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const failingStore: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota exceeded');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

const favourite: Favourite = {
  id: 'ikeda|2026-10-21|text',
  savedAt: '2026-10-21T08:00:00.000Z',
  result: {
    sourceId: 'ikeda',
    sourceName: 'Soka Gakkai Global',
    pageUrl: 'https://www.sokaglobal.org/resources/daily-encouragement/october-21.html',
    kind: 'primary',
    status: 'verified_today',
    statusNote: 'Verified',
    requestedDate: '2026-10-21',
    passage: { text: 'Kept passage', attribution: 'Daisaku Ikeda' },
  },
};

describe('favourites, journal and goals persist on the device', () => {
  it('keeps favourites between sessions', () => {
    const store = memoryStore();
    expect(saveFavourites(store, [favourite])).toBe(true);
    expect(loadFavourites(store)).toEqual([favourite]);
  });

  it('keeps journal entries and goals between sessions', () => {
    const store = memoryStore();
    saveJournal(store, { '2026-10-21': 'Private note' });
    saveGoals(store, 'Learn to listen more');
    expect(loadJournal(store)).toEqual({ '2026-10-21': 'Private note' });
    expect(loadGoals(store)).toBe('Learn to listen more');
  });

  it('limits saved goals to 1000 characters', () => {
    const store = memoryStore();
    saveGoals(store, 'g'.repeat(1500));
    expect(loadGoals(store)).toHaveLength(1000);
  });

  it('does not crash and reports failure when storage is blocked', () => {
    expect(saveFavourites(failingStore, [favourite])).toBe(false);
    expect(loadFavourites(failingStore)).toEqual([]);
    expect(loadJournal(null)).toEqual({});
    expect(loadGoals(null)).toBe('');
  });

  it('ignores corrupted stored values instead of crashing', () => {
    const store = memoryStore();
    store.setItem(KEYS.favourites, '{not json');
    store.setItem(KEYS.journal, '[1,2,3]');
    expect(loadFavourites(store)).toEqual([]);
    expect(loadJournal(store)).toEqual({});
  });
});

describe('clearing personal data', () => {
  it('removes favourites, journal, goals and archive, and nothing else', () => {
    const store = memoryStore();
    saveFavourites(store, [favourite]);
    saveJournal(store, { '2026-10-21': 'x' });
    saveGoals(store, 'goal');
    store.setItem(KEYS.archive, '[]');
    store.setItem('unrelated-key', 'keep me');

    expect(clearPersonalData(store)).toBe(true);
    expect(store.getItem(KEYS.favourites)).toBeNull();
    expect(store.getItem(KEYS.journal)).toBeNull();
    expect(store.getItem(KEYS.goals)).toBeNull();
    expect(store.getItem(KEYS.archive)).toBeNull();
    expect(store.getItem('unrelated-key')).toBe('keep me');
  });

  it('reports failure rather than pretending the data was cleared', () => {
    expect(clearPersonalData(failingStore)).toBe(false);
    expect(clearPersonalData(null)).toBe(false);
  });
});

describe('copy to clipboard', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('uses the Clipboard API and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await expect(copyText('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to the copy command when the Clipboard API is refused', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;
    await expect(copyText('fallback text')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('reports failure honestly when neither method works', async () => {
    document.execCommand = vi.fn().mockReturnValue(false);
    await expect(copyText('nothing')).resolves.toBe(false);
  });
});

describe('copy text content', () => {
  const nichiren: ShownSection = {
    result: {
      sourceId: 'nichiren',
      sourceName: 'Brilliant Brent East SGI blog',
      pageUrl: 'https://brilliantbrenteastbuddhists.blogspot.com/2026/10/x.html',
      kind: 'secondary',
      status: 'secondary_date_matched',
      statusNote: 'note',
      requestedDate: '2026-10-21',
      passage: {
        text: 'Nichiren passage text.',
        attribution: 'Nichiren Daishonin (as published by the blog)',
        reference: 'The Writings of Nichiren Daishonin, page 953',
      },
    },
    provenance: 'fresh',
  };

  const ikeda: ShownSection = {
    result: {
      sourceId: 'ikeda',
      sourceName: 'Soka Gakkai Global',
      pageUrl: 'https://www.sokaglobal.org/resources/daily-encouragement/october-21.html',
      kind: 'primary',
      status: 'verified_today',
      statusNote: 'note',
      requestedDate: '2026-10-21',
      passage: { text: 'Ikeda passage text.', attribution: 'Daisaku Ikeda' },
    },
    provenance: 'fresh',
  };

  const reflection = buildReflection({ passageText: 'Ikeda passage text.', date: '2026-10-21' });

  it('the determination copy is labelled as a personal reflection', () => {
    const text = determinationCopyText(reflection, 'Wednesday, 21 October 2026');
    expect(text).toContain(reflection.determination);
    expect(text).toContain('not a Buddhist quotation');
  });

  it('the full reading copy includes both sources, their links and the reflection label', () => {
    const text = readingCopyText({
      dateLabel: 'Wednesday, 21 October 2026',
      nichiren,
      ikeda,
      reflection,
      reflectionBasis: 'Ikeda',
      todayIso: '2026-10-21',
    });
    expect(text).toContain('Nichiren passage text.');
    expect(text).toContain('Ikeda passage text.');
    expect(text).toContain('https://www.sokaglobal.org/resources/daily-encouragement/october-21.html');
    expect(text).toContain('(secondary)');
    expect(text).toContain(reflection.label);
  });

  it('describes cached content as cached and not newly retrieved', () => {
    const cached: ShownSection = { ...ikeda, provenance: 'cached', retrievedAt: '2026-10-21T07:00:00.000Z' };
    const line = provenanceLine(cached, '2026-10-21');
    expect(line).toContain('Cached copy for 2026-10-21');
    expect(line).toContain('not newly retrieved or current');
  });

  it('warns when a result is for another date', () => {
    const line = provenanceLine(ikeda, '2026-10-22');
    expect(line).toBe('This result is for 2026-10-21, not today.');
  });
});
