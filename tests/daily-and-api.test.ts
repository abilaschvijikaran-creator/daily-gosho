import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDailyGuidance } from '../src/sources/daily';
import { parseIsoDate } from '../src/lib/london-date';
import { onRequest } from '../functions/api/daily';

const ikedaHtml = readFileSync(join(__dirname, 'fixtures', 'ikeda-october-21.html'), 'utf8');
const blogFeed = readFileSync(join(__dirname, 'fixtures', 'blog-feed-october-21.json'), 'utf8');
const OCT_21 = parseIsoDate('2026-10-21')!;

/** Routes a fake fetch by URL so each source can succeed or fail independently. */
function routedFetch(routes: { ikeda: () => Response | Promise<Response>; blog: () => Response | Promise<Response> }) {
  return vi.fn(async (url: string) => {
    if (url.includes('sokaglobal.org')) return routes.ikeda();
    if (url.includes('brilliantbrenteastbuddhists')) return routes.blog();
    throw new Error(`Unexpected URL in test: ${url}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('one source can succeed while the other fails', () => {
  it('returns the official passage even when the blog is down', async () => {
    const fetchImpl = routedFetch({
      ikeda: () => new Response(ikedaHtml, { status: 200 }),
      blog: () => new Response('down', { status: 503 }),
    });
    const result = await getDailyGuidance(OCT_21, { fetchImpl: fetchImpl as never });
    expect(result.ikeda.status).toBe('verified_today');
    expect(result.ikeda.passage?.text).toContain('impossible to build personal happiness');
    expect(result.nichiren.status).toBe('source_unavailable');
    expect(result.nichiren.passage).toBeUndefined();
  });

  it('returns the blog passage even when the official site is unreachable', async () => {
    const fetchImpl = routedFetch({
      ikeda: () => {
        throw new TypeError('network');
      },
      blog: () => new Response(blogFeed, { status: 200 }),
    });
    const result = await getDailyGuidance(OCT_21, { fetchImpl: fetchImpl as never });
    expect(result.ikeda.status).toBe('retrieval_failed');
    expect(result.ikeda.passage).toBeUndefined();
    expect(result.nichiren.status).toBe('secondary_date_matched');
  });

  it('reports both failures honestly when both sources are down', async () => {
    const fetchImpl = routedFetch({
      ikeda: () => new Response('', { status: 500 }),
      blog: () => new Response('', { status: 500 }),
    });
    const result = await getDailyGuidance(OCT_21, { fetchImpl: fetchImpl as never });
    expect(result.ikeda.passage).toBeUndefined();
    expect(result.nichiren.passage).toBeUndefined();
    expect(result.requestedDate).toBe('2026-10-21');
  });
});

describe('Cloudflare Pages Function /api/daily', () => {
  function request(path: string, method = 'GET'): { request: Request } {
    return { request: new Request(`https://app.example.test${path}`, { method }) };
  }

  it('rejects a missing or impossible date with 400 and no source calls', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const bad = await onRequest(request('/api/daily?date=2026-02-30'));
    expect(bad.status).toBe(400);
    const junk = await onRequest(request('/api/daily?date=<script>'));
    expect(junk.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses methods other than GET', async () => {
    const response = await onRequest(request('/api/daily?date=2026-10-21', 'POST'));
    expect(response.status).toBe(405);
  });

  it('returns JSON with no-store caching and the requested date', async () => {
    vi.stubGlobal(
      'fetch',
      routedFetch({
        ikeda: () => new Response(ikedaHtml, { status: 200 }),
        blog: () => new Response(blogFeed, { status: 200 }),
      }),
    );
    const response = await onRequest(request('/api/daily?date=2026-10-21'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.requestedDate).toBe('2026-10-21');
    expect(body.ikeda.status).toBe('verified_today');
    expect(body.nichiren.status).toBe('secondary_date_matched');
  });
});
