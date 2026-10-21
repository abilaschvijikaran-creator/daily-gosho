import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseIkedaPage, fetchIkeda } from '../src/sources/ikeda';
import { parseIsoDate } from '../src/lib/london-date';

const fixture = readFileSync(join(__dirname, 'fixtures', 'ikeda-october-21.html'), 'utf8');
const OCT_21 = parseIsoDate('2026-10-21')!;
const OCT_22 = parseIsoDate('2026-10-22')!;

const QUOTE =
  'From the Buddhist perspective, it is impossible to build personal happiness on the sufferings of others.';

function fakeResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html' } });
}

describe('official Soka Gakkai daily page parser', () => {
  it('reads the exact published text from the matching date page', () => {
    const result = parseIkedaPage(fixture, OCT_21);
    expect(result.status).toBe('verified_today');
    expect(result.passage?.text).toBe(QUOTE);
    expect(result.passage?.attribution).toBe('Daisaku Ikeda');
    expect(result.passage?.reference).toBe(
      'From a lecture at Harvard University, Cambridge, USA, September 26, 1991.',
    );
    expect(result.kind).toBe('primary');
  });

  it('links to the actual official page for that date', () => {
    expect(parseIkedaPage(fixture, OCT_21).pageUrl).toBe(
      'https://www.sokaglobal.org/resources/daily-encouragement/october-21.html',
    );
  });

  it('never shows a passage from the wrong date as today’s', () => {
    // The page is for 21 October; asking for 22 October must not reuse it.
    const result = parseIkedaPage(fixture, OCT_22);
    expect(result.status).toBe('date_not_matched');
    expect(result.passage).toBeUndefined();
  });

  it('reports an honest failure when the page layout has changed', () => {
    const result = parseIkedaPage('<html><body><p>New design</p></body></html>', OCT_21);
    expect(result.status).toBe('source_unavailable');
    expect(result.passage).toBeUndefined();
  });

  it('returns plain text only, with script and markup removed', () => {
    const injected = fixture.replace(
      QUOTE,
      'Safe words <script>alert("x")</script><img src=x onerror="alert(1)"> &amp; more',
    );
    const result = parseIkedaPage(injected, OCT_21);
    expect(result.passage?.text).toBe('Safe words & more');
    expect(result.passage?.text).not.toContain('<');
  });
});

describe('official Soka Gakkai fetch', () => {
  it('treats a 404 as “no date passage” rather than a failure', async () => {
    const result = await fetchIkeda(OCT_21, async () => fakeResponse('not found', 404));
    expect(result.status).toBe('no_date_passage');
    expect(result.passage).toBeUndefined();
  });

  it('reports a server error as source unavailable', async () => {
    const result = await fetchIkeda(OCT_21, async () => fakeResponse('oops', 503));
    expect(result.status).toBe('source_unavailable');
    expect(result.statusNote).toContain('503');
  });

  it('reports a network error as retrieval failed without inventing text', async () => {
    const result = await fetchIkeda(OCT_21, async () => {
      throw new TypeError('network down');
    });
    expect(result.status).toBe('retrieval_failed');
    expect(result.passage).toBeUndefined();
  });

  it('verifies the page when the fetched HTML is the real fixture', async () => {
    const result = await fetchIkeda(OCT_21, async () => fakeResponse(fixture));
    expect(result.status).toBe('verified_today');
    expect(result.passage?.text).toBe(QUOTE);
  });
});
