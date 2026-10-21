// Retrieves both sources for one London date. Each source is independent: if one
// fails, the other result is still returned unchanged.

import type { LondonDate } from '../lib/london-date';
import { fetchIkeda } from './ikeda';
import { fetchNichirenBlog } from './nichiren-blog';
import type { FetchLike } from './fetch-util';
import type { DailyResponse } from './types';

export interface DailyOptions {
  fetchImpl?: FetchLike;
  now?: () => Date;
}

export async function getDailyGuidance(date: LondonDate, options: DailyOptions = {}): Promise<DailyResponse> {
  const { fetchImpl, now = () => new Date() } = options;
  const [ikeda, nichiren] = await Promise.all([
    fetchIkeda(date, fetchImpl),
    fetchNichirenBlog(date, fetchImpl),
  ]);
  return {
    requestedDate: date.iso,
    retrievedAt: now().toISOString(),
    ikeda,
    nichiren,
  };
}
