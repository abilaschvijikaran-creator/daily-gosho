import { describe, expect, it } from 'vitest';
import { combineForDisplay, entryToStore } from '../src/lib/guidance-state';
import { addToArchive, ARCHIVE_LIMIT } from '../src/lib/storage';
import type { CachedDay, DailyResponse, SourceResult } from '../src/sources/types';

const DATE = '2026-10-21';
const OTHER_DATE = '2026-10-20';

function passage(sourceId: 'ikeda' | 'nichiren', date: string, text = `${sourceId} text`): SourceResult {
  return {
    sourceId,
    sourceName: sourceId,
    pageUrl: `https://example.test/${sourceId}`,
    kind: sourceId === 'ikeda' ? 'primary' : 'secondary',
    status: sourceId === 'ikeda' ? 'verified_today' : 'secondary_date_matched',
    statusNote: 'note',
    requestedDate: date,
    passage: { text, attribution: 'Attribution' },
  };
}

function failed(sourceId: 'ikeda' | 'nichiren', date: string): SourceResult {
  return {
    sourceId,
    sourceName: sourceId,
    pageUrl: 'https://example.test',
    kind: sourceId === 'ikeda' ? 'primary' : 'secondary',
    status: 'retrieval_failed',
    statusNote: 'could not reach',
    requestedDate: date,
  };
}

function response(
  date: string,
  ikeda: SourceResult,
  nichiren: SourceResult,
  retrievedAt = '2026-10-21T08:00:00.000Z',
): DailyResponse {
  return { requestedDate: date, retrievedAt, ikeda, nichiren };
}

describe('showing cached content honestly', () => {
  it('uses the cached copy for a section that failed today, with its original time', () => {
    const cached: CachedDay = {
      date: DATE,
      retrievedAt: '2026-10-21T07:00:00.000Z',
      sectionRetrievedAt: { ikeda: '2026-10-21T07:00:00.000Z' },
      response: response(DATE, passage('ikeda', DATE, 'old ikeda'), failed('nichiren', DATE)),
    };
    const fresh = response(
      DATE,
      failed('ikeda', DATE),
      passage('nichiren', DATE, 'new nichiren'),
      '2026-10-21T09:00:00.000Z',
    );

    const shown = combineForDisplay(fresh, cached);
    expect(shown.nichiren.provenance).toBe('fresh');
    expect(shown.ikeda.provenance).toBe('cached');
    expect(shown.ikeda.result.passage?.text).toBe('old ikeda');
    expect(shown.ikeda.retrievedAt).toBe('2026-10-21T07:00:00.000Z');
  });

  it('never uses a cached copy from a different date', () => {
    const cached: CachedDay = {
      date: OTHER_DATE,
      retrievedAt: '2026-10-20T07:00:00.000Z',
      response: response(OTHER_DATE, passage('ikeda', OTHER_DATE, 'yesterday'), failed('nichiren', OTHER_DATE)),
    };
    const shown = combineForDisplay(response(DATE, failed('ikeda', DATE), failed('nichiren', DATE)), cached);
    expect(shown.ikeda.provenance).toBe('fresh');
    expect(shown.ikeda.result.passage).toBeUndefined();
  });

  it('does not overwrite a usable cached passage with a failed retrieval', () => {
    const cached: CachedDay = {
      date: DATE,
      retrievedAt: '2026-10-21T07:00:00.000Z',
      response: response(DATE, passage('ikeda', DATE, 'kept'), passage('nichiren', DATE, 'kept too')),
    };
    const entry = entryToStore(response(DATE, failed('ikeda', DATE), failed('nichiren', DATE)), cached);
    expect(entry?.response.ikeda.passage?.text).toBe('kept');
    expect(entry?.response.nichiren.passage?.text).toBe('kept too');
  });

  it('stores nothing when no section has a usable passage', () => {
    expect(entryToStore(response(DATE, failed('ikeda', DATE), failed('nichiren', DATE)), undefined)).toBeNull();
  });

  it('keeps the per-section time for a section kept from an earlier retrieval', () => {
    const cached: CachedDay = {
      date: DATE,
      retrievedAt: '2026-10-21T07:00:00.000Z',
      sectionRetrievedAt: { ikeda: '2026-10-21T07:00:00.000Z', nichiren: '2026-10-21T07:00:00.000Z' },
      response: response(DATE, passage('ikeda', DATE), passage('nichiren', DATE)),
    };
    const entry = entryToStore(
      response(DATE, failed('ikeda', DATE), passage('nichiren', DATE, 'newer'), '2026-10-21T10:00:00.000Z'),
      cached,
    );
    expect(entry?.sectionRetrievedAt?.ikeda).toBe('2026-10-21T07:00:00.000Z');
    expect(entry?.sectionRetrievedAt?.nichiren).toBe('2026-10-21T10:00:00.000Z');
  });
});

describe('archive', () => {
  it('replaces the entry for the same date and keeps newest first', () => {
    const older: CachedDay = {
      date: OTHER_DATE,
      retrievedAt: 'a',
      response: response(OTHER_DATE, failed('ikeda', OTHER_DATE), failed('nichiren', OTHER_DATE)),
    };
    const first: CachedDay = {
      date: DATE,
      retrievedAt: 'b',
      response: response(DATE, failed('ikeda', DATE), failed('nichiren', DATE)),
    };
    const replaced: CachedDay = { ...first, retrievedAt: 'c' };
    const archive = addToArchive(addToArchive([older], first), replaced);
    expect(archive.map((item) => item.date)).toEqual([DATE, OTHER_DATE]);
    expect(archive[0].retrievedAt).toBe('c');
  });

  it('keeps no more than the archive limit', () => {
    let archive: CachedDay[] = [];
    for (let day = 1; day <= ARCHIVE_LIMIT + 5; day++) {
      const date = `2026-01-${String(day).padStart(2, '0')}`;
      archive = addToArchive(archive, {
        date,
        retrievedAt: date,
        response: response(date, failed('ikeda', date), failed('nichiren', date)),
      });
    }
    expect(archive).toHaveLength(ARCHIVE_LIMIT);
  });
});
