// Personal data stays on this device in localStorage. Nothing here is sent to any
// server. Every access is wrapped in try/catch, because storage can be blocked or
// full (for example in some private browsing modes), and the app must still work.

import type { CachedDay, SourceResult } from '../sources/types';

export const KEYS = {
  favourites: 'daily-gosho.favourites.v1',
  journal: 'daily-gosho.journal.v1',
  goals: 'daily-gosho.goals.v1',
  archive: 'daily-gosho.archive.v1',
} as const;

export const ARCHIVE_LIMIT = 60;

export interface Favourite {
  id: string;
  savedAt: string;
  /** The verified source result as it was when saved, including its date and status. */
  result: SourceResult;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Returns the browser's localStorage, or null if it cannot be used. */
export function browserStorage(): StorageLike | null {
  try {
    const store = window.localStorage;
    const probe = '__daily-gosho-probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

function readJson<T>(store: StorageLike | null, key: string, fallback: T): T {
  if (store === null) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(store: StorageLike | null, key: string, value: unknown): boolean {
  if (store === null) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadFavourites(store: StorageLike | null): Favourite[] {
  const value = readJson<unknown>(store, KEYS.favourites, []);
  return Array.isArray(value) ? (value as Favourite[]) : [];
}

export function saveFavourites(store: StorageLike | null, favourites: Favourite[]): boolean {
  return writeJson(store, KEYS.favourites, favourites);
}

export function loadJournal(store: StorageLike | null): Record<string, string> {
  const value = readJson<unknown>(store, KEYS.journal, {});
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};
}

export function saveJournal(store: StorageLike | null, journal: Record<string, string>): boolean {
  return writeJson(store, KEYS.journal, journal);
}

export function loadGoals(store: StorageLike | null): string {
  const value = readJson<unknown>(store, KEYS.goals, '');
  return typeof value === 'string' ? value : '';
}

export function saveGoals(store: StorageLike | null, goals: string): boolean {
  return writeJson(store, KEYS.goals, goals.slice(0, 1000));
}

/** Previously retrieved days, newest first. Always shown as cached, never as fresh. */
export function loadArchive(store: StorageLike | null): CachedDay[] {
  const value = readJson<unknown>(store, KEYS.archive, []);
  return Array.isArray(value) ? (value as CachedDay[]) : [];
}

/** Adds or replaces the entry for a date, keeping only the newest ARCHIVE_LIMIT days. */
export function addToArchive(existing: CachedDay[], entry: CachedDay): CachedDay[] {
  const rest = existing.filter((item) => item.date !== entry.date);
  return [entry, ...rest]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, ARCHIVE_LIMIT);
}

export function saveArchive(store: StorageLike | null, archive: CachedDay[]): boolean {
  return writeJson(store, KEYS.archive, archive);
}

/** Removes every piece of personal data stored by the app. */
export function clearPersonalData(store: StorageLike | null): boolean {
  if (store === null) return false;
  try {
    for (const key of Object.values(KEYS)) store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
