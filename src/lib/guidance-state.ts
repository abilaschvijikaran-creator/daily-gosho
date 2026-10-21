// Rules for combining a fresh retrieval with what the device already holds for the
// same date. Key rule: a failed or empty section never replaces a usable cached one,
// and each cached section keeps its own retrieval time and is labelled as cached.

import type { CachedDay, DailyResponse, SourceResult } from '../sources/types';
import { hasUsablePassage } from '../sources/types';
import type { ShownSection } from './present';

type SectionKey = 'ikeda' | 'nichiren';

function sectionTime(cached: CachedDay, key: SectionKey): string {
  return cached.sectionRetrievedAt?.[key] ?? cached.retrievedAt;
}

/** Shows the fresh section if usable; otherwise the cached usable one for the same date. */
function pickSection(
  fresh: SourceResult,
  freshAt: string,
  cached: CachedDay | undefined,
  key: SectionKey,
): ShownSection {
  if (hasUsablePassage(fresh)) {
    return { result: fresh, provenance: 'fresh', retrievedAt: freshAt };
  }
  const old = cached?.response[key];
  if (cached && old && hasUsablePassage(old) && old.requestedDate === fresh.requestedDate) {
    return { result: old, provenance: 'cached', retrievedAt: sectionTime(cached, key) };
  }
  return { result: fresh, provenance: 'fresh', retrievedAt: freshAt };
}

/** The sections to show for a fresh response, using the cached copy only where needed. */
export function combineForDisplay(
  fresh: DailyResponse,
  cached: CachedDay | undefined,
): { nichiren: ShownSection; ikeda: ShownSection } {
  return {
    nichiren: pickSection(fresh.nichiren, fresh.retrievedAt, cached, 'nichiren'),
    ikeda: pickSection(fresh.ikeda, fresh.retrievedAt, cached, 'ikeda'),
  };
}

/**
 * The archive entry to store after a fresh response. Usable fresh sections replace the
 * old ones; otherwise the old usable section is kept. Returns null if nothing is usable.
 */
export function entryToStore(fresh: DailyResponse, cached: CachedDay | undefined): CachedDay | null {
  const pick = (key: SectionKey): { result: SourceResult; at: string | undefined } | null => {
    if (hasUsablePassage(fresh[key])) return { result: fresh[key], at: fresh.retrievedAt };
    const old = cached?.response[key];
    if (cached && old && hasUsablePassage(old) && old.requestedDate === fresh.requestedDate) {
      return { result: old, at: sectionTime(cached, key) };
    }
    return null;
  };

  const ikeda = pick('ikeda');
  const nichiren = pick('nichiren');
  if (ikeda === null && nichiren === null) return null;

  const times = {
    ikeda: ikeda?.at,
    nichiren: nichiren?.at,
  };
  const newest = [times.ikeda, times.nichiren]
    .filter((value): value is string => value !== undefined)
    .sort()
    .pop() as string;

  return {
    date: fresh.requestedDate,
    retrievedAt: newest,
    sectionRetrievedAt: times,
    response: {
      requestedDate: fresh.requestedDate,
      retrievedAt: fresh.retrievedAt,
      ikeda: ikeda?.result ?? fresh.ikeda,
      nichiren: nichiren?.result ?? fresh.nichiren,
    },
  };
}
