import { describe, expect, it } from 'vitest';
import { formatLondonDate, londonDateFor, monthDaySlug, parseIsoDate } from '../src/lib/london-date';

describe('London date calculation', () => {
  it('uses the UK date just after UK midnight even when UTC is still the previous day', () => {
    // 2026-10-20 23:30 UTC is 2026-10-21 00:30 in London (BST still in force).
    expect(londonDateFor(new Date('2026-10-20T23:30:00Z')).iso).toBe('2026-10-21');
  });

  it('uses the UK date when a phone is set to a far-away time zone', () => {
    // 2026-10-21 03:00 UTC is still 2026-10-21 in London, though it is 2026-10-20 in New York.
    expect(londonDateFor(new Date('2026-10-21T03:00:00Z')).iso).toBe('2026-10-21');
  });

  it('handles the spring daylight-saving change (BST starts 29 March 2026)', () => {
    expect(londonDateFor(new Date('2026-03-28T23:30:00Z')).iso).toBe('2026-03-28');
    expect(londonDateFor(new Date('2026-03-29T00:30:00Z')).iso).toBe('2026-03-29');
  });

  it('handles the autumn daylight-saving change (BST ends 25 October 2026)', () => {
    expect(londonDateFor(new Date('2026-10-24T22:30:00Z')).iso).toBe('2026-10-24');
    expect(londonDateFor(new Date('2026-10-25T00:30:00Z')).iso).toBe('2026-10-25');
  });

  it('returns year, month and day as numbers that match the ISO string', () => {
    const date = londonDateFor(new Date('2026-10-21T12:00:00Z'));
    expect(date).toEqual({ iso: '2026-10-21', year: 2026, month: 10, day: 21 });
  });

  it('formats a readable London date with the weekday', () => {
    expect(formatLondonDate(new Date('2026-10-21T12:00:00Z'))).toBe('Wednesday, 21 October 2026');
  });
});

describe('month-day slugs for the official site', () => {
  it('uses lower-case month names and an unpadded day', () => {
    expect(monthDaySlug(parseIsoDate('2026-10-21')!)).toBe('october-21');
    expect(monthDaySlug(parseIsoDate('2026-01-01')!)).toBe('january-1');
    expect(monthDaySlug(parseIsoDate('2028-02-29')!)).toBe('february-29');
  });
});

describe('date validation', () => {
  it('accepts real calendar dates only', () => {
    expect(parseIsoDate('2026-10-21')).not.toBeNull();
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
  });

  it('rejects impossible or malformed dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('21/10/2026')).toBeNull();
    expect(parseIsoDate('not a date')).toBeNull();
  });
});
