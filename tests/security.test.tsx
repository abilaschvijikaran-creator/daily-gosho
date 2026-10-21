import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SourceSection } from '../src/components/SourceSection';
import { htmlFragmentToText, decodeEntities } from '../src/sources/html-text';
import type { ShownSection } from '../src/lib/present';

const ROOT = join(__dirname, '..');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(tsx?|js)$/.test(name) ? [path] : [];
  });
}

describe('external text cannot execute', () => {
  it('turns markup in a passage into visible text, not elements', () => {
    const hostile: ShownSection = {
      provenance: 'fresh',
      result: {
        sourceId: 'ikeda',
        sourceName: 'Soka Gakkai Global',
        pageUrl: 'https://www.sokaglobal.org/resources/daily-encouragement/october-21.html',
        kind: 'primary',
        status: 'verified_today',
        statusNote: 'Verified',
        requestedDate: '2026-10-21',
        passage: {
          text: '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>Plain words',
          attribution: 'Daisaku Ikeda',
        },
      },
    };

    const { container } = render(
      <SourceSection
        heading="2. Test"
        section={hostile}
        todayIso="2026-10-21"
        isFavourite={false}
        onToggleFavourite={() => {}}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('strips script and style blocks and decodes entities into plain text', () => {
    expect(htmlFragmentToText('<script>alert(1)</script>Hi &amp; bye<style>p{}</style>')).toBe('Hi & bye');
    expect(decodeEntities('&#8217;&rsquo;&#x2014;')).toBe('’’—');
  });

  it('does not use raw HTML insertion anywhere in the application source', () => {
    const offenders = listSourceFiles(join(ROOT, 'src')).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /dangerouslySetInnerHTML|innerHTML\s*=|outerHTML\s*=|document\.write\(/.test(text);
    });
    expect(offenders).toEqual([]);
  });
});
