// Template-based reflection engine. It runs entirely on the device.
// It does NOT call any AI service, and its output is labelled as template-generated.

import { THEMES, UNCLASSIFIED_THEME, type Theme } from './themes';

export const REFLECTION_LABEL = 'Generated from templates on this device – not a live AI reflection';

export interface Reflection {
  label: string;
  themeLabel: string;
  /** True when no theme keyword matched, so the reflection is a limited fallback. */
  limitedFallback: boolean;
  /** Our interpretation of the passage. Not the author's words. */
  explanation: string;
  /** How the principle might apply in ordinary life. */
  application: string;
  /** First-person determination. Personal reflection, not a Buddhist quotation. */
  determination: string;
  /** One small, concrete action for today. */
  action: string;
}

export interface Classification {
  theme: Theme;
  /** The keyword as it appears in the passage, lower-cased. */
  phrase: string;
}

const MAX_GOAL_LENGTH = 200;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Picks the theme whose keyword appears earliest in the passage. Only whole-word
 * matches count, so "others" does not match "brothers".
 */
export function classifyPassage(text: string): Classification | null {
  let best: { theme: Theme; phrase: string; index: number } | null = null;
  for (const theme of THEMES) {
    for (const keyword of theme.keywords) {
      const pattern = new RegExp(`(^|[^a-z])(${escapeRegExp(keyword)})(?=[^a-z]|$)`, 'i');
      const match = pattern.exec(text);
      if (!match) continue;
      const index = match.index + match[1].length;
      if (best === null || index < best.index) {
        best = { theme, phrase: keyword.toLowerCase(), index };
      }
    }
  }
  return best ? { theme: best.theme, phrase: best.phrase } : null;
}

/** Simple, stable 32-bit hash (FNV-1a), so the same input always picks the same template. */
export function stableHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: string, offset = 0): T {
  return items[(stableHash(seed) + offset) % items.length];
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

function cleanGoal(goal: string | undefined): string | null {
  const trimmed = (goal ?? '').replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_GOAL_LENGTH);
}

export interface ReflectionInput {
  /** The passage text exactly as retrieved (plain text). */
  passageText: string;
  /** "YYYY-MM-DD" London date; used with the text to choose the same template every time today. */
  date: string;
  /** Optional personal goal from Settings. Kept on the device; never sent anywhere. */
  goal?: string;
}

/** Builds the reflection for one passage. Returns a limited fallback when no theme applies. */
export function buildReflection(input: ReflectionInput): Reflection {
  const seed = `${input.date}|${input.passageText}`;
  const goal = cleanGoal(input.goal);
  const classification = classifyPassage(input.passageText);

  if (classification === null) {
    const excerpt = input.passageText.split(/\s+/).slice(0, 8).join(' ');
    return {
      label: REFLECTION_LABEL,
      themeLabel: UNCLASSIFIED_THEME.label,
      limitedFallback: true,
      explanation:
        'This is a limited fallback. None of the built-in themes was recognised in this passage, so the app does not claim to explain its meaning. Read the original words and their reference yourself.',
      application:
        'Read the passage slowly once today, and notice which phrase stays with you. That phrase is the one to consider.',
      determination: `Today I will read the words I have been given, beginning "${excerpt}", and let one of them guide a choice I make.`,
      action: 'Read the passage aloud once, then write down one word from it that you want to remember.',
    };
  }

  const { theme, phrase } = classification;
  const values = { phrase, goal: goal ?? '' };
  const applicationBase = fill(pick(theme.application, seed, 0), values);
  const application = goal
    ? `${applicationBase} You noted this goal in Settings: "${goal}". Today's action can be one small step toward it.`
    : applicationBase;

  return {
    label: REFLECTION_LABEL,
    themeLabel: theme.label,
    limitedFallback: false,
    explanation: `${fill(pick(theme.explanation, seed, 1), values)} ${theme.principle}`,
    application,
    determination: fill(pick(theme.determination, seed, 2), values),
    action: pick(theme.actions, seed, 3),
  };
}
