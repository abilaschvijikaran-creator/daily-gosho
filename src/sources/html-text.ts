// Converts untrusted HTML from external sites into plain text. The result is
// only ever rendered as text (React escapes it), so no markup or script from a
// source can run in the app. Tags are removed and entities decoded here.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
};

/** Decodes numeric and common named HTML entities. Unknown entities are left as-is. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return codePointOrOriginal(parseInt(body.slice(2), 16), whole);
    }
    if (body.startsWith('#')) {
      return codePointOrOriginal(parseInt(body.slice(1), 10), whole);
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

function codePointOrOriginal(codePoint: number, original: string): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return original;
  return String.fromCodePoint(codePoint);
}

/** Converts an HTML fragment to plain text with line breaks preserved for <br> and block ends. */
export function htmlFragmentToText(html: string): string {
  const withoutScripts = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)\s*>/gi, '\n');
  const withoutTags = withBreaks.replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags)
    .replace(/[ \t ]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Collapses all whitespace to single spaces, for single-line values such as titles. */
export function normaliseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
