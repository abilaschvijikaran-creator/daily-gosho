// Cloudflare Pages Function: GET /api/daily?date=YYYY-MM-DD
//
// Why this exists: the official Soka Gakkai site does not send CORS headers, so
// a browser on the app's own domain cannot read it directly. This function runs on
// Cloudflare's servers, fetches the sources, and returns plain JSON to the app.
// It does not store anything and never calls a paid service.

import { londonDateFor, parseIsoDate } from '../../src/lib/london-date';
import { getDailyGuidance } from '../../src/sources/daily';

interface PagesContext {
  request: Request;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  // Results must not be cached by browsers or CDNs: each tap should be a fresh attempt.
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET', 'Cache-Control': 'no-store' },
    });
  }

  const url = new URL(context.request.url);
  const requested = url.searchParams.get('date');
  const date = requested === null ? londonDateFor() : parseIsoDate(requested);

  if (date === null) {
    return jsonResponse({ error: 'Invalid or missing date. Use YYYY-MM-DD.' }, 400);
  }

  const result = await getDailyGuidance(date);
  return jsonResponse(result);
}
