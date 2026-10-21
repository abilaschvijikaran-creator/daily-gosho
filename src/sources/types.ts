// Data model. Each layer is kept separate on purpose:
//   - SourcePassage: text and metadata exactly as taken from a source (untrusted)
//   - SourceResult:  the outcome of one retrieval, with an honest status
//   - Reflection:    our own generated interpretation (never shown as source text)

/** Status values from the spec. Only "verified_today" may be shown as verified for today. */
export type SourceStatus =
  /** Date-specific page found and the date association was checked against the source. */
  | 'verified_today'
  /** Passage found from a secondary calendar whose own date label matches today. */
  | 'secondary_date_matched'
  /** Passage found, but the date could not be matched to today. Never shown as today's. */
  | 'date_not_matched'
  /** Source responded but has no passage for this date. */
  | 'no_date_passage'
  /** Source could not be reached or returned an unexpected page layout. */
  | 'source_unavailable'
  /** A fetch failed for another reason (network error, server error). */
  | 'retrieval_failed';

export type SourceKind = 'primary' | 'secondary';

export interface SourcePassage {
  /** The exact text as published. Plain text only, never HTML. */
  text: string;
  /** Who is credited with the text, e.g. "Daisaku Ikeda". */
  attribution: string;
  /** Title of the original writing, if any. */
  writingTitle?: string;
  /** Page, chapter or section reference, if the source gives one. */
  reference?: string;
  /** Date the source states the writing was written, if any (free text). */
  writtenDate?: string;
  /** Date label the source gives for this entry, e.g. "October 21". */
  sourceDateLabel?: string;
}

export interface SourceResult {
  /** Stable id: "ikeda" or "nichiren". */
  sourceId: 'ikeda' | 'nichiren';
  /** Display name of the source, e.g. "Soka Gakkai Global". */
  sourceName: string;
  /** Link to the actual page the text came from. */
  pageUrl: string;
  kind: SourceKind;
  status: SourceStatus;
  /** Plain-language explanation of the status for the reader. */
  statusNote: string;
  /** Only present when status is verified_today or secondary_date_matched. */
  passage?: SourcePassage;
  /** The London date the request was made for, "YYYY-MM-DD". */
  requestedDate: string;
}

export interface DailyResponse {
  requestedDate: string;
  /** ISO timestamp of when the server fetched the sources. */
  retrievedAt: string;
  ikeda: SourceResult;
  nichiren: SourceResult;
}

/** Cached entry stored on the device after a successful retrieval. */
export interface CachedDay {
  date: string;
  /** When the newest usable section was retrieved. */
  retrievedAt: string;
  /** When each section was last successfully retrieved (kept per section). */
  sectionRetrievedAt?: { ikeda?: string; nichiren?: string };
  response: DailyResponse;
}

/** Whether a status counts as a successful passage for the reader. */
export function hasUsablePassage(result: SourceResult): boolean {
  return (
    (result.status === 'verified_today' || result.status === 'secondary_date_matched') &&
    result.passage !== undefined &&
    result.passage.text.length > 0
  );
}
