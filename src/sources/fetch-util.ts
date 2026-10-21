// Small helper around fetch with a timeout. Tests inject a fake fetch instead of
// touching the network; the deployed Cloudflare Function uses the real fetch.

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const SOURCE_TIMEOUT_MS = 8000;

const USER_AGENT = 'DailyGosho/1.0 (personal daily reading app; low-volume requests)';

export function fetchWithTimeout(url: string, fetchImpl: FetchLike = fetch): Promise<Response> {
  return fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json;q=0.9' },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    redirect: 'follow',
  });
}
