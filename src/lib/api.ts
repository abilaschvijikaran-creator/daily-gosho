// Client side of the app: calls our own /api/daily function. The response is
// treated as untrusted and checked for the expected shape before it is displayed.

import type { DailyResponse, SourceResult } from '../sources/types';

const STATUS_VALUES = new Set([
  'verified_today',
  'secondary_date_matched',
  'date_not_matched',
  'no_date_passage',
  'source_unavailable',
  'retrieval_failed',
]);

function isSourceResult(value: unknown): value is SourceResult {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    (item.sourceId === 'ikeda' || item.sourceId === 'nichiren') &&
    typeof item.sourceName === 'string' &&
    typeof item.pageUrl === 'string' &&
    (item.kind === 'primary' || item.kind === 'secondary') &&
    typeof item.status === 'string' &&
    STATUS_VALUES.has(item.status) &&
    typeof item.statusNote === 'string' &&
    typeof item.requestedDate === 'string' &&
    (item.passage === undefined || typeof item.passage === 'object')
  );
}

export function isDailyResponse(value: unknown): value is DailyResponse {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.requestedDate === 'string' &&
    typeof item.retrievedAt === 'string' &&
    isSourceResult(item.ikeda) &&
    isSourceResult(item.nichiren)
  );
}

/** Asks our function for the sources. Throws on network or server errors. */
export async function fetchDaily(isoDate: string, signal?: AbortSignal): Promise<DailyResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/daily?date=${encodeURIComponent(isoDate)}`, {
      cache: 'no-store',
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('Could not reach the guidance service. Check your connection, then try again.');
  }
  if (!response.ok) {
    throw new Error(`The app's guidance service responded with HTTP ${response.status}.`);
  }
  const body: unknown = await response.json();
  if (!isDailyResponse(body)) {
    throw new Error('The guidance service returned data in an unexpected format.');
  }
  return body;
}
