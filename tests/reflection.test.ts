import { describe, expect, it } from 'vitest';
import { buildReflection, classifyPassage, stableHash, REFLECTION_LABEL } from '../src/reflection/engine';
import { THEMES } from '../src/reflection/themes';

const IKEDA_TEXT =
  'From the Buddhist perspective, it is impossible to build personal happiness on the sufferings of others.';
const STONE_TIGER =
  'The mighty warrior General Li Kuang, whose mother had been devoured by a tiger, shot an arrow at the stone he believed was the tiger. Realizing this, you must strengthen your faith more than ever.';

describe('theme classification', () => {
  it('classifies the official Ikeda passage from its own words', () => {
    expect(classifyPassage(IKEDA_TEXT)?.theme.id).toBe('dignity');
    expect(classifyPassage(IKEDA_TEXT)?.phrase).toBe('happiness');
  });

  it('classifies the Nichiren passage from words it actually contains', () => {
    expect(classifyPassage(STONE_TIGER)?.theme.id).toBe('courage');
  });

  it('matches whole words only', () => {
    expect(classifyPassage('Brothers and sisters gathered here.')).toBeNull();
    expect(classifyPassage('We think of others first.')?.theme.id).toBe('encouraging');
  });

  it('returns null when no theme keyword appears', () => {
    expect(classifyPassage('The sky was grey over the hills.')).toBeNull();
  });
});

describe('reflection output', () => {
  it('is labelled as template-based, not as a live AI reflection', () => {
    const reflection = buildReflection({ passageText: IKEDA_TEXT, date: '2026-10-21' });
    expect(reflection.label).toBe(REFLECTION_LABEL);
    expect(reflection.label).toMatch(/not a live AI/);
  });

  it('gives all four parts: explanation, application, determination and action', () => {
    const reflection = buildReflection({ passageText: IKEDA_TEXT, date: '2026-10-21' });
    for (const part of [reflection.explanation, reflection.application, reflection.determination, reflection.action]) {
      expect(part.trim().length).toBeGreaterThan(20);
    }
    expect(reflection.limitedFallback).toBe(false);
  });

  it('ties the determination to a word that appears in the passage', () => {
    const reflection = buildReflection({ passageText: IKEDA_TEXT, date: '2026-10-21' });
    const quoted = /“([^”]+)”/.exec(reflection.determination)?.[1];
    expect(quoted).toBe('happiness');
    expect(IKEDA_TEXT.toLowerCase()).toContain(quoted!.toLowerCase());
  });

  it('keeps every quoted phrase inside the passage, for every theme', () => {
    for (const theme of THEMES) {
      const keyword = theme.keywords[0];
      const passage = `Sample text about ${keyword} for testing the reflection rules.`;
      const reflection = buildReflection({ passageText: passage, date: '2026-10-21' });
      expect(reflection.themeLabel).toBe(theme.label);
      for (const sentence of [reflection.explanation, reflection.determination]) {
        for (const match of sentence.matchAll(/“([^”]+)”/g)) {
          expect(passage.toLowerCase()).toContain(match[1].toLowerCase());
        }
      }
    }
  });

  it('is deterministic for the same passage and date', () => {
    const a = buildReflection({ passageText: STONE_TIGER, date: '2026-10-21' });
    const b = buildReflection({ passageText: STONE_TIGER, date: '2026-10-21' });
    expect(a).toEqual(b);
  });

  it('uses a stable hash so wording can vary between days', () => {
    expect(stableHash('a')).toBe(stableHash('a'));
    expect(stableHash('2026-10-21|x')).not.toBe(stableHash('2026-10-22|x'));
  });
});

describe('limited fallback for unrecognised passages', () => {
  it('admits it cannot explain the meaning and does not invent a theme', () => {
    const passage = 'Rivers run to the sea without asking the mountains for permission.';
    const reflection = buildReflection({ passageText: passage, date: '2026-10-21' });
    expect(reflection.limitedFallback).toBe(true);
    expect(reflection.themeLabel).toMatch(/limited/i);
    expect(reflection.explanation).toContain('limited fallback');
    expect(reflection.determination).toContain('Rivers run to the sea');
  });
});

describe('personal goals', () => {
  it('adds the user’s own goal to the application when one is set', () => {
    const reflection = buildReflection({
      passageText: IKEDA_TEXT,
      date: '2026-10-21',
      goal: 'Finish my course essay',
    });
    expect(reflection.application).toContain('Finish my course essay');
  });

  it('adds nothing about goals when none is set', () => {
    const reflection = buildReflection({ passageText: IKEDA_TEXT, date: '2026-10-21', goal: '   ' });
    expect(reflection.application).not.toContain('noted this goal');
  });

  it('limits a very long goal so it cannot flood the screen', () => {
    const reflection = buildReflection({ passageText: IKEDA_TEXT, date: '2026-10-21', goal: 'x'.repeat(500) });
    expect(reflection.application).toContain('x'.repeat(200));
    expect(reflection.application).not.toContain('x'.repeat(201));
  });
});
