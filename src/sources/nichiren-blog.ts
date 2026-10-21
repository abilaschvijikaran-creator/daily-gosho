// Adapter for "Sensei's Daily Encouragement" on the Brilliant Brent East blog.
// This is a SECONDARY source: it republishes passages from Nichiren Daishonin's
// writings, and it chooses the passage for each day itself. No official daily
// Nichiren calendar was found, so a passage from this blog is always labelled
// secondary and is never presented as the official passage for the day.
//
// The blog's feed (Blogger JSON) is searched for the post whose title carries
// the requested date. Blogger search is fuzzy, so the title must match exactly.

import type { LondonDate } from '../lib/london-date';
import { htmlFragmentToText, normaliseSpaces } from './html-text';
import type { SourceResult, SourcePassage } from './types';
import { FetchLike, fetchWithTimeout } from './fetch-util';

export const BLOG_HOME = 'https://brilliantbrenteastbuddhists.blogspot.com';

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

const SOURCE_NAME = "Brilliant Brent East SGI blog – Sensei's Daily Encouragement";
const NICHIREN_HEADING = 'From the Writings of Nichiren Daishonin';
const REFERENCE_PREFIX = 'The Writings of Nichiren Daishonin,';

export function blogFeedUrl(date: LondonDate): string {
  const phrase = `"${MONTH_NAMES[date.month - 1]} ${date.day} ${date.year}"`;
  return `${BLOG_HOME}/feeds/posts/default?alt=json&max-results=25&q=${encodeURIComponent(phrase)}`;
}

/** Title fragment that identifies the post for one date, e.g. "October 21 2026". */
function postTitleDate(date: LondonDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day} ${date.year}`;
}

/** Date line as the blog prints it inside the post, e.g. "October 21, 2026". */
function bodyDateLine(date: LondonDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}`;
}

interface FeedEntry {
  title: { $t: string };
  content?: { $t: string };
  link?: Array<{ rel: string; href: string }>;
}

/**
 * Parses the Nichiren section of a blog post for one date.
 * Returns the passage text plus its stated reference, or null if not found.
 */
export function extractNichirenSection(
  plainLines: string[],
  date: LondonDate,
): { passage: SourcePassage; dateMatched: boolean } | null {
  const headingIndex = plainLines.findIndex((line) => line === NICHIREN_HEADING);
  if (headingIndex === -1) return null;

  const section: string[] = [];
  for (let i = headingIndex + 1; i < plainLines.length; i++) {
    const line = plainLines[i];
    if (line.startsWith('____') || /^(Wisdom for Modern Life|Excerpt from|Daily Encouragement by)/.test(line)) {
      break;
    }
    section.push(line);
  }

  const bodyDate = section[0] ?? '';
  const dateMatched = normaliseSpaces(bodyDate) === bodyDateLine(date);

  const referenceIndex = section.findIndex((line) => line.startsWith(REFERENCE_PREFIX));
  const passageLines = referenceIndex === -1 ? section.slice(1) : section.slice(1, referenceIndex);
  const text = normaliseSpaces(passageLines.join(' '));
  if (text.length === 0) return null;

  const passage: SourcePassage = {
    text,
    attribution: 'Nichiren Daishonin (as published by the blog)',
    sourceDateLabel: normaliseSpaces(bodyDate),
  };
  if (referenceIndex !== -1) {
    passage.reference = section[referenceIndex];
    if (section[referenceIndex + 1]) passage.writingTitle = section[referenceIndex + 1];
    const writtenLine = section.find((line) => line.startsWith('Written to '));
    if (writtenLine) passage.writtenDate = writtenLine;
  }
  return { passage, dateMatched };
}

/** Finds the feed entry whose title names exactly this date. */
export function findPostForDate(entries: FeedEntry[], date: LondonDate): FeedEntry | undefined {
  const wanted = postTitleDate(date);
  return entries.find((entry) => {
    const title = normaliseSpaces(entry.title.$t);
    return title.startsWith("Sensei's Daily Encouragement") && title.includes(`-${wanted}-`);
  });
}

function permalinkFor(entry: FeedEntry): string {
  const link = entry.link?.find((item) => item.rel === 'alternate');
  if (link && link.href.startsWith(`${BLOG_HOME}/`)) return link.href;
  return BLOG_HOME;
}

/** Parses a JSON feed response for one date. Pure function, testable with saved JSON. */
export function parseBlogFeed(feed: unknown, date: LondonDate): SourceResult {
  const base = {
    sourceId: 'nichiren' as const,
    sourceName: SOURCE_NAME,
    pageUrl: BLOG_HOME,
    kind: 'secondary' as const,
    requestedDate: date.iso,
  };

  const entries = readEntries(feed);
  if (entries === null) {
    return {
      ...base,
      status: 'source_unavailable',
      statusNote: 'The blog responded, but its feed was not in the expected format.',
    };
  }

  const entry = findPostForDate(entries, date);
  if (!entry) {
    return {
      ...base,
      status: 'no_date_passage',
      statusNote: 'The blog has no post for this date yet.',
    };
  }

  const pageUrl = permalinkFor(entry);
  const lines = htmlFragmentToText(entry.content?.$t ?? '').split('\n');
  const section = extractNichirenSection(lines, date);

  if (!section) {
    return {
      ...base,
      pageUrl,
      status: 'no_date_passage',
      statusNote: 'The blog post for this date has no Nichiren passage section.',
    };
  }
  if (!section.dateMatched) {
    return {
      ...base,
      pageUrl,
      status: 'date_not_matched',
      statusNote: `The Nichiren section is labelled "${section.passage.sourceDateLabel}", not "${bodyDateLine(date)}", so it is not shown as today's passage.`,
    };
  }

  return {
    ...base,
    pageUrl,
    status: 'secondary_date_matched',
    statusNote:
      'Secondary source: the blog dates this passage to today, but the passage was not independently checked against a primary text. Check the reference before relying on it.',
    passage: section.passage,
  };
}

function readEntries(feed: unknown): FeedEntry[] | null {
  if (typeof feed !== 'object' || feed === null) return null;
  const root = feed as { feed?: { entry?: unknown } };
  if (!root.feed) return null;
  const entries = root.feed.entry;
  if (entries === undefined) return [];
  if (!Array.isArray(entries)) return null;
  return entries as FeedEntry[];
}

/** Fetches the blog feed for one date. */
export async function fetchNichirenBlog(date: LondonDate, fetchImpl?: FetchLike): Promise<SourceResult> {
  const base = {
    sourceId: 'nichiren' as const,
    sourceName: SOURCE_NAME,
    pageUrl: BLOG_HOME,
    kind: 'secondary' as const,
    requestedDate: date.iso,
  };
  try {
    const response = await fetchWithTimeout(blogFeedUrl(date), fetchImpl);
    if (!response.ok) {
      return {
        ...base,
        status: 'source_unavailable',
        statusNote: `The blog responded with HTTP ${response.status}. Try again later.`,
      };
    }
    return parseBlogFeed(await response.json(), date);
  } catch (error) {
    return {
      ...base,
      status: 'retrieval_failed',
      statusNote: `The blog could not be reached (${error instanceof Error ? error.name : 'unknown error'}).`,
    };
  }
}
