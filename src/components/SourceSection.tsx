import { hasUsablePassage } from '../sources/types';
import { formatDateTime, provenanceLine, statusLabel, type ShownSection } from '../lib/present';

interface SourceSectionProps {
  heading: string;
  section: ShownSection;
  todayIso: string;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

/**
 * One source passage. Text is rendered as plain React text, so nothing from the
 * external site can run as HTML or script.
 */
export function SourceSection({ heading, section, todayIso, isFavourite, onToggleFavourite }: SourceSectionProps) {
  const { result } = section;
  const usable = hasUsablePassage(result);
  const isCached = section.provenance === 'cached';
  const statusClass = usable && !isCached ? 'status ok' : 'status muted';

  return (
    <section className="card" aria-labelledby={`heading-${result.sourceId}`}>
      <h2 id={`heading-${result.sourceId}`}>{heading}</h2>
      <p className={statusClass}>
        {result.kind === 'secondary' ? 'Secondary · ' : 'Primary · '}
        {provenanceLine(section, todayIso)}
      </p>
      {isCached && section.retrievedAt && (
        <p className="muted small">Retrieved earlier: {formatDateTime(section.retrievedAt)}</p>
      )}

      {usable && result.passage ? (
        <figure className="passage">
          <blockquote>{result.passage.text}</blockquote>
          <figcaption>— {result.passage.attribution}</figcaption>
          {result.passage.writingTitle && (
            <p className="small">
              <strong>Writing:</strong> {result.passage.writingTitle}
            </p>
          )}
          {result.passage.reference && (
            <p className="small">
              <strong>Reference:</strong> {result.passage.reference}
            </p>
          )}
          {result.passage.writtenDate && <p className="small">{result.passage.writtenDate}</p>}
          {result.passage.sourceDateLabel && (
            <p className="small">
              <strong>Date on source:</strong> {result.passage.sourceDateLabel}
            </p>
          )}
        </figure>
      ) : (
        <p>
          <strong>{statusLabel(result.status)}.</strong>
        </p>
      )}

      <p className="small">{result.statusNote}</p>

      <p className="small">
        <a href={result.pageUrl} target="_blank" rel="noopener noreferrer">
          Open the source page ({result.sourceName})
        </a>
      </p>

      {usable && (
        <button type="button" className="button text" onClick={onToggleFavourite} aria-pressed={isFavourite}>
          {isFavourite ? '★ Saved to favourites' : '☆ Save to favourites'}
        </button>
      )}
    </section>
  );
}
