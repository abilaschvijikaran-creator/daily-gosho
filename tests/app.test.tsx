import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { parseIkedaPage } from '../src/sources/ikeda';
import { parseBlogFeed } from '../src/sources/nichiren-blog';
import { parseIsoDate } from '../src/lib/london-date';
import { KEYS } from '../src/lib/storage';
import type { DailyResponse } from '../src/sources/types';

const ikedaHtml = readFileSync(join(__dirname, 'fixtures', 'ikeda-october-21.html'), 'utf8');
const blogFeed = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'blog-feed-october-21.json'), 'utf8'));
const IKEDA_TEXT =
  'From the Buddhist perspective, it is impossible to build personal happiness on the sufferings of others.';

/** Builds a response by running the real parsers on the saved fixtures. */
function responseFor(isoDate: string): DailyResponse {
  const date = parseIsoDate(isoDate)!;
  return {
    requestedDate: isoDate,
    retrievedAt: '2026-10-21T08:00:00.000Z',
    ikeda: parseIkedaPage(ikedaHtml, date),
    nichiren: parseBlogFeed(blogFeed, date),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  // Only the Date is faked, so user-event and React keep their normal timers.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z')); // 12:00 in London on 21 October 2026
  fetchMock = vi.fn(async (url: string) => {
    const match = /date=([0-9-]+)/.exec(url);
    return jsonResponse(responseFor(match ? match[1] : '2026-10-21'));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Today screen', () => {
  it('shows the UK date and the main button as soon as the app opens', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Wednesday, 21 October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Today’s Guidance' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calculates the date from London time, not from the phone’s own zone', () => {
    // 23:30 UTC on 20 October is already 00:30 on 21 October in London.
    vi.setSystemTime(new Date('2026-10-20T23:30:00Z'));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wednesday, 21 October 2026');
  });

  it('recalculates the London date when the button is tapped, across midnight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('21 October 2026');

    // Move the clock past London midnight without re-rendering first.
    vi.setSystemTime(new Date('2026-10-21T23:30:00Z')); // 00:30 on 22 October in London
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('date=2026-10-22');
  });

  it('shows the official passage, labelled verified, with its source link', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    expect(await screen.findByText(IKEDA_TEXT)).toBeInTheDocument();
    expect(screen.getByText(/Primary · Verified for today/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open the source page \(Soka Gakkai Global/ });
    expect(link).toHaveAttribute(
      'href',
      'https://www.sokaglobal.org/resources/daily-encouragement/october-21.html',
    );
    expect(screen.getByText('Secondary · Secondary source – date matches today')).toBeInTheDocument();
  });

  it('shows the reflection, labelled as template-based and not as AI', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    const reflection = await screen.findByRole('region', { name: 'Reflection' });
    expect(within(reflection).getByText(/Generated from templates on this device/)).toBeInTheDocument();
    expect(within(reflection).getByRole('heading', { name: '5. My determination today' })).toBeInTheDocument();
    expect(within(reflection).getByText(/not a Buddhist quotation/)).toBeInTheDocument();
  });

  it('ignores a second tap while the first request is still running', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let release: (value: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    render(<App />);
    const button = screen.getByRole('button', { name: 'Get Today’s Guidance' });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Getting today’s guidance…' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(jsonResponse(responseFor('2026-10-21')));
    });
    expect(await screen.findByText(IKEDA_TEXT)).toBeInTheDocument();
  });

  it('shows a clear failure with a retry button, and offers no invented text', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Retrieval failed');
    expect(screen.queryByText(IKEDA_TEXT)).not.toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(jsonResponse(responseFor('2026-10-21')));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(IKEDA_TEXT)).toBeInTheDocument();
  });

  it('never shows a passage for another date as today’s', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    fetchMock.mockResolvedValueOnce(jsonResponse(responseFor('2026-10-20')));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('not 2026-10-21');
    expect(screen.queryByText(IKEDA_TEXT)).not.toBeInTheDocument();
  });

  it('shows a cached copy from an earlier retrieval, labelled as cached, when the network fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    localStorage.setItem(
      KEYS.archive,
      JSON.stringify([
        {
          date: '2026-10-21',
          retrievedAt: '2026-10-21T07:00:00.000Z',
          sectionRetrievedAt: { ikeda: '2026-10-21T07:00:00.000Z', nichiren: '2026-10-21T07:00:00.000Z' },
          response: responseFor('2026-10-21'),
        },
      ]),
    );
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));

    expect(await screen.findByText(IKEDA_TEXT)).toBeInTheDocument();
    expect(screen.getAllByText(/not newly retrieved or current/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Verified for today')).not.toBeInTheDocument();
  });

  it('saves a successful retrieval to the archive on this device', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));
    await screen.findByText(IKEDA_TEXT);

    const stored = JSON.parse(localStorage.getItem(KEYS.archive) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe('2026-10-21');
  });
});

describe('copy buttons', () => {
  it('copy the determination and show accessible feedback', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));
    await screen.findByText(IKEDA_TEXT);
    await user.click(screen.getByRole('button', { name: 'Copy today’s determination' }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('My determination for');
    expect(await screen.findByText('Copied to clipboard.')).toBeInTheDocument();
  });
});

describe('favourites, journal and settings', () => {
  it('saves a passage to favourites on this device and lists it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));
    await screen.findByText(IKEDA_TEXT);

    // The first button is the Nichiren section; the second is the official Ikeda passage.
    await user.click(screen.getAllByRole('button', { name: '☆ Save to favourites' })[1]);
    expect(JSON.parse(localStorage.getItem(KEYS.favourites) ?? '[]')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Favourites' }));
        expect(screen.getByText(IKEDA_TEXT)).toBeInTheDocument();
  });

  it('saves a journal entry on this device', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Journal' }));
    await user.type(screen.getByLabelText('Journal entry for today'), 'A private note');
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(screen.getByText('Saved on this device.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KEYS.journal) ?? '{}')).toEqual({ '2026-10-21': 'A private note' });
  });

  it('saves goals and uses them in the personal application', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(screen.getByLabelText(/Goals or challenges/), 'Be more patient at work');
    await user.click(screen.getByRole('button', { name: 'Save goals' }));
    expect(JSON.parse(localStorage.getItem(KEYS.goals) ?? '""')).toBe('Be more patient at work');

    await user.click(screen.getByRole('button', { name: 'Today' }));
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));
    expect(await screen.findByText(/Be more patient at work/)).toBeInTheDocument();
  });

  it('deletes all personal data on this device only after confirmation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    localStorage.setItem(KEYS.journal, JSON.stringify({ '2026-10-21': 'secret' }));
    localStorage.setItem(KEYS.goals, JSON.stringify('goal'));
    localStorage.setItem('unrelated', 'keep');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Delete all personal data on this device' }));
    expect(localStorage.getItem(KEYS.journal)).not.toBeNull();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Delete all personal data on this device' }));
    expect(localStorage.getItem(KEYS.journal)).toBeNull();
    expect(localStorage.getItem(KEYS.goals)).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
    expect(screen.getByText('All personal data on this device has been deleted.')).toBeInTheDocument();
  });

  it('shows the archive as cached copies with their original dates', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Get Today’s Guidance' }));
    await screen.findByText(IKEDA_TEXT);
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(screen.getByRole('button', { name: /2026-10-21 · cached/ })).toBeInTheDocument();
    expect(screen.getByText(/These are cached copies/)).toBeInTheDocument();
  });
});
