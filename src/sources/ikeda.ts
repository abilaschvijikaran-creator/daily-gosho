// Adapter for the official Soka Gakkai Global "Daily Encouragement" pages.
// Each day has its own page, e.g. /resources/daily-encouragement/october-21.html.
// The page shows a date label ("October 21") and a canonical link; both must match
// the requested London date before the passage is treated as verified for today.

import { monthDaySlug, type LondonDate } from '../lib/london-date';
import { htmlFragmentToText, normaliseSpaces } from './html-text';
import type { SourceResult } from './types';
import { FetchLike, fetchWithTimeout } from './fetch-util';

export const IKEDA_BASE_URL = 'https://www.sokaglobal.org/resources/daily-encouragement';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function ikedaPageUrl(date: LondonDate): string {
  return `${IKEDA_BASE_URL}/${monthDaySlug(date)}.html`;
}

/** Date label as the official page prints it, e.g. "October 21". */
function expectedDateLabel(date: LondonDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}`;
}

/**
 * Parses an official daily page. Returns a SourceResult without network calls,
 * so the rules can be tested with saved HTML.
 */
export function parseIkedaPage(html: string, date: LondonDate): SourceResult {
  const base = {
    sourceId: 'ikeda' as const,
    sourceName: 'Soka Gakkai Global – Daily Encouragement',
    pageUrl: ikedaPageUrl(date),
    kind: 'primary' as const,
    requestedDate: date.iso,
  };

  const boxStart = html.indexOf('class="box01"');
  const boxEnd = html.indexOf('class="select01', boxStart);
  if (boxStart === -1 || boxEnd === -1) {
    return {
      ...base,
      status: 'source_unavailable',
      statusNote:
        'The official page loaded, but its layout was not recognised, so no passage was read from it.',
    };
  }
  const box = html.slice(boxStart, boxEnd);

  const labelMatch = /<div class="date">([^<]*)<\/div>/.exec(box);
  const quoteMatch = /<div class="text">([\s\S]*?)<\/div>/.exec(box);
  const referenceMatch = /<div class="name">([\s\S]*?)<\/div>/.exec(box);
  const canonicalMatch = /<link rel="canonical" href="([^"]*)"/.exec(html);

  if (!labelMatch || !quoteMatch) {
    return {
      ...base,
      status: 'source_unavailable',
      statusNote:
        'The official page loaded, but its date or quotation block was not found, so no passage was read.',
    };
  }

  const dateLabel = normaliseSpaces(htmlFragmentToText(labelMatch[1]));
  const expected = expectedDateLabel(date);
  const canonicalOk =
    canonicalMatch === null || canonicalMatch[1].endsWith(`/${monthDaySlug(date)}.html`);

  if (dateLabel !== expected || !canonicalOk) {
    return {
      ...base,
      status: 'date_not_matched',
      statusNote: `The official page found is labelled "${dateLabel}", not "${expected}", so it is not shown as today's passage.`,
    };
  }

  const text = htmlFragmentToText(quoteMatch[1]);
  if (text.length === 0) {
    return {
      ...base,
      status: 'no_date_passage',
      statusNote: 'The official page for this date has no quotation text.',
    };
  }

  const context = referenceMatch ? normaliseSpaces(htmlFragmentToText(referenceMatch[1])) : undefined;

  return {
    ...base,
    status: 'verified_today',
    statusNote: `Verified: the official page addressed "${dateLabel}" (its address and date label both match today in the UK). The page does not show a year, so the match is by month and day.`,
    passage: {
      text,
      attribution: 'Daisaku Ikeda',
      reference: context,
      sourceDateLabel: dateLabel,
    },
  };
}

/** Fetches and parses the official page for the given London date. */
export async function fetchIkeda(date: LondonDate, fetchImpl?: FetchLike): Promise<SourceResult> {
  const base = {
    sourceId: 'ikeda' as const,
    sourceName: 'Soka Gakkai Global – Daily Encouragement',
    pageUrl: ikedaPageUrl(date),
    kind: 'primary' as const,
    requestedDate: date.iso,
  };
  try {
    const response = await fetchWithTimeout(ikedaPageUrl(date), fetchImpl);
    if (response.status === 404) {
      return {
        ...base,
        status: 'no_date_passage',
        statusNote: 'The official site has no daily page for this date.',
      };
    }
    if (!response.ok) {
      return {
        ...base,
        status: 'source_unavailable',
        statusNote: `The official site responded with HTTP ${response.status}. Try again later.`,
      };
    }
    return parseIkedaPage(await response.text(), date);
  } catch (error) {
    return {
      ...base,
      status: 'retrieval_failed',
      statusNote: `The official site could not be reached (${errorLabel(error)}).`,
    };
  }
}

function errorLabel(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown error';
}
