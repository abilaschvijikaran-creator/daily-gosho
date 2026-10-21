import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBlogFeed, fetchNichirenBlog, blogFeedUrl } from '../src/sources/nichiren-blog';
import { parseIsoDate } from '../src/lib/london-date';

const feed = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'blog-feed-october-21.json'), 'utf8'));
const OCT_21 = parseIsoDate('2026-10-21')!;
const OCT_20 = parseIsoDate('2026-10-20')!;

const STONE_TIGER_START = 'The mighty warrior General Li Kuang';

function clone(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('secondary blog parser (Nichiren passage)', () => {
  it('labels the passage as secondary and keeps its date and reference', () => {
    const result = parseBlogFeed(feed, OCT_21);
    expect(result.status).toBe('secondary_date_matched');
    expect(result.kind).toBe('secondary');
    expect(result.passage?.text.startsWith(STONE_TIGER_START)).toBe(true);
    expect(result.passage?.reference).toBe('The Writings of Nichiren Daishonin, page 953');
    expect(result.passage?.writingTitle).toBe('General Stone Tiger');
    expect(result.passage?.writtenDate).toBe('Written to Shijo Kingo on October 22, 1278');
    expect(result.passage?.sourceDateLabel).toBe('October 21, 2026');
  });

  it('does not take Ikeda text from the blog', () => {
    const result = parseBlogFeed(feed, OCT_21);
    expect(result.passage?.text).not.toContain('mentality of getting others');
    expect(result.passage?.attribution).toContain('Nichiren Daishonin');
  });

  it('says plainly that the passage is not independently checked', () => {
    expect(parseBlogFeed(feed, OCT_21).statusNote).toContain('not independently checked');
  });

  it('reports no passage when the blog has no post for the requested date', () => {
    const result = parseBlogFeed(feed, OCT_20);
    expect(result.status).toBe('no_date_passage');
    expect(result.passage).toBeUndefined();
  });

  it('does not show a passage whose own date label differs from the requested day', () => {
    const copy = clone(feed);
    // Change only the Nichiren section’s date line (the second "October 21, 2026" in the post).
    const content: string = copy.feed.entry[0].content.$t;
    const index = content.indexOf('From the Writings of Nichiren Daishonin');
    const before = content.slice(0, index);
    const after = content.slice(index).replace('October 21, 2026', 'October 20, 2026');
    copy.feed.entry[0].content.$t = before + after;
    const result = parseBlogFeed(copy, OCT_21);
    expect(result.status).toBe('date_not_matched');
    expect(result.passage).toBeUndefined();
  });

  it('does not match a post whose title only contains part of the date', () => {
    const copy = clone(feed);
    copy.feed.entry[0].title.$t = "Sensei's Daily Encouragement -October 211 2026- Year";
    expect(parseBlogFeed(copy, OCT_21).status).toBe('no_date_passage');
  });

  it('reports a malformed feed as source unavailable', () => {
    expect(parseBlogFeed({ unexpected: true }, OCT_21).status).toBe('source_unavailable');
    expect(parseBlogFeed(null, OCT_21).status).toBe('source_unavailable');
  });

  it('builds a date-specific search URL', () => {
    expect(blogFeedUrl(OCT_21)).toContain('q=%22October%2021%202026%22');
  });
});

describe('secondary blog fetch', () => {
  it('reports a server error as source unavailable', async () => {
    const result = await fetchNichirenBlog(OCT_21, async () => fakeResponse({}, 500));
    expect(result.status).toBe('source_unavailable');
  });

  it('reports a network error as retrieval failed', async () => {
    const result = await fetchNichirenBlog(OCT_21, async () => {
      throw new TypeError('offline');
    });
    expect(result.status).toBe('retrieval_failed');
    expect(result.passage).toBeUndefined();
  });

  it('parses a real-shaped feed response', async () => {
    const result = await fetchNichirenBlog(OCT_21, async () => fakeResponse(feed));
    expect(result.status).toBe('secondary_date_matched');
  });
});
