// All "today" calculations use the Europe/London time zone, so the app shows the
// UK date even when the phone is set to another zone. Intl handles British
// Summer Time (BST) changes automatically.

export const APP_TIME_ZONE = 'Europe/London';

export interface LondonDate {
  /** ISO-style calendar date, e.g. "2026-10-21". */
  iso: string;
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const displayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Returns the London calendar date for the given instant (defaults to now). */
export function londonDateFor(instant: Date = new Date()): LondonDate {
  const iso = isoFormatter.format(instant); // en-CA gives YYYY-MM-DD
  const [year, month, day] = iso.split('-').map(Number);
  return { iso, year, month, day };
}

/** Human-readable date, e.g. "Tuesday, 20 October 2026". */
export function formatLondonDate(instant: Date = new Date()): string {
  return displayFormatter.format(instant);
}

const MONTH_SLUGS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** Month-day slug used by the official site, e.g. "october-21". */
export function monthDaySlug(date: LondonDate): string {
  return `${MONTH_SLUGS[date.month - 1]}-${date.day}`;
}

/** Validates a "YYYY-MM-DD" string and returns it, or null if it is not a real date. */
export function parseIsoDate(value: string): LondonDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { iso: value, year, month, day };
}
