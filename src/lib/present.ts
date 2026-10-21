// Pure helpers for what the reader sees: status labels, provenance wording and the
// text that the copy buttons put on the clipboard. Kept free of React so tests can
// check the exact wording.

import type { SourceResult, SourceStatus } from '../sources/types';
import { hasUsablePassage } from '../sources/types';
import type { Reflection } from '../reflection/engine';

export interface ShownSection {
  result: SourceResult;
  /** "fresh" = retrieved in this tap; "cached" = from an earlier successful retrieval on this device. */
  provenance: 'fresh' | 'cached';
  /** When the cached copy was originally retrieved (ISO). Only for cached sections. */
  retrievedAt?: string;
}

const STATUS_LABELS: Record<SourceStatus, string> = {
  verified_today: 'Verified for today',
  secondary_date_matched: 'Secondary source – date matches today',
  date_not_matched: 'Not shown – date does not match today',
  no_date_passage: 'No passage found for this date',
  source_unavailable: 'Source unavailable',
  retrieval_failed: 'Retrieval failed',
};

export function statusLabel(status: SourceStatus): string {
  return STATUS_LABELS[status];
}

/** Short provenance line shown under each section heading. */
export function provenanceLine(section: ShownSection, todayIso: string): string {
  if (section.provenance === 'cached') {
    const when = section.retrievedAt ? formatDateTime(section.retrievedAt) : 'an earlier time';
    return `Cached copy for ${section.result.requestedDate}, originally retrieved ${when}. It is not newly retrieved or current.`;
  }
  if (section.result.requestedDate !== todayIso) {
    return `This result is for ${section.result.requestedDate}, not today.`;
  }
  return statusLabel(section.result.status);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Text for the "copy today's determination" button. */
export function determinationCopyText(reflection: Reflection, dateLabel: string): string {
  return [
    `My determination for ${dateLabel}`,
    '',
    reflection.determination,
    '',
    '(A personal reflection generated on this device from a template. It is not a Buddhist quotation.)',
  ].join('\n');
}

/** Text for the "copy complete daily reading" button, with sources and statuses. */
export function readingCopyText(options: {
  dateLabel: string;
  nichiren: ShownSection;
  ikeda: ShownSection;
  reflection: Reflection | null;
  reflectionBasis: string | null;
  todayIso: string;
}): string {
  const { dateLabel, nichiren, ikeda, reflection, reflectionBasis, todayIso } = options;
  const lines: string[] = [`Daily Gosho – ${dateLabel}`, ''];

  lines.push('1. Today’s Nichiren Daishonin guidance');
  lines.push(...sectionCopyLines(nichiren, todayIso));
  lines.push('');

  lines.push('2. Ikeda Sensei’s daily encouragement');
  lines.push(...sectionCopyLines(ikeda, todayIso));
  lines.push('');

  if (reflection) {
    lines.push(`Reflection (${reflection.label}; based on ${reflectionBasis ?? 'a verified passage'})`);
    lines.push('');
    lines.push('3. What this guidance means in plain English');
    lines.push(reflection.explanation);
    lines.push('');
    lines.push('4. What this means personally for me today');
    lines.push(reflection.application);
    lines.push('');
    lines.push('5. My determination today (personal reflection, not a Buddhist quotation)');
    lines.push(reflection.determination);
    lines.push('');
    lines.push('6. My practical action today');
    lines.push(reflection.action);
  }
  return lines.join('\n').trimEnd();
}

function sectionCopyLines(section: ShownSection, todayIso: string): string[] {
  const result = section.result;
  const lines = [`Source: ${result.sourceName}${result.kind === 'secondary' ? ' (secondary)' : ' (primary)'}`];
  lines.push(`Status: ${provenanceLine(section, todayIso)}`);
  if (hasUsablePassage(result) && result.passage) {
    lines.push('');
    lines.push(`“${result.passage.text}”`);
    lines.push(`— ${result.passage.attribution}`);
    if (result.passage.writingTitle) lines.push(`Writing: ${result.passage.writingTitle}`);
    if (result.passage.reference) lines.push(`Reference: ${result.passage.reference}`);
    if (result.passage.writtenDate) lines.push(result.passage.writtenDate);
  } else {
    lines.push('No passage is shown for this section.');
  }
  lines.push(`Link: ${result.pageUrl}`);
  return lines;
}
