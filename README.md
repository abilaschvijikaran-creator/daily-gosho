# Daily Gosho

A small, free, installable web app (PWA) that shows today's UK date and a single button, **Get Today's Guidance**. Tapping it retrieves the day's guidance from two sources and shows where each passage came from, how it was checked, and a template-based reflection.

## What the app does

1. Opens on today's date in the **Europe/London** time zone (British Summer Time handled automatically).
2. **Get Today's Guidance** fetches fresh guidance for that London date. Each tap recalculates the date.
3. Shows, in order:
   1. **Today's Nichiren Daishonin guidance** – from a *secondary* blog, labelled as secondary.
   2. **Ikeda Sensei's daily encouragement** – from the *official* Soka Gakkai Global page.
   3. A **plain-English explanation**, **personal application**, **determination** and **practical action**, clearly labelled as a template-based reflection (not AI, not a quotation).
4. Copy buttons for the determination and the complete reading.
5. Archive of earlier retrievals (shown as cached), favourites, a private journal, personal goals and a settings screen that deletes all personal data on the device.

## Project structure

```
index.html                 App entry page (PWA meta tags)
src/
  main.tsx                 Starts React and registers the service worker (production only)
  App.tsx / App.css        Navigation and the design (forest green, cream, restrained gold; dark mode)
  views/                   Today, Archive, Favourites, Journal, Settings screens
  components/              Source passage card, reflection card, copy button
  lib/
    london-date.ts         Europe/London date handling
    api.ts                 Calls /api/daily and validates the response
    guidance-state.ts      Rules for combining fresh and cached results
    present.ts             Status wording and copy-to-clipboard text
    storage.ts             Personal data on the device (localStorage, with error handling)
    clipboard.ts           Copy with a fallback
  sources/
    ikeda.ts               Adapter: official Soka Gakkai Global daily pages
    nichiren-blog.ts       Adapter: secondary blog feed (Nichiren passage)
    daily.ts               Retrieves both sources independently
    html-text.ts           Converts untrusted HTML to plain text
    types.ts               Data model and status values
  reflection/
    themes.ts              Theme library (keywords, templates, actions)
    engine.ts              Template-based reflection engine (runs on the device)
functions/api/daily.ts     Cloudflare Pages Function: GET /api/daily?date=YYYY-MM-DD
public/                    manifest, service worker (sw.js), icons, security headers
tests/                     Automated tests; fixtures are real saved pages (see below)
tests/e2e/run-e2e.mjs      Browser test against the running app and live sources
```

## Technology and why

- **React + TypeScript + Vite**: a small, common stack; a static build that Cloudflare Pages hosts for free.
- **One small server function (Cloudflare Pages Function)**: the official Soka Gakkai site does **not** send CORS headers, so a browser on the app's own domain cannot read it directly (verified with a request carrying an `Origin` header: no `Access-Control-Allow-Origin` in the response). The function fetches both sources on the server and returns plain JSON.
- **No database, no accounts, no analytics, no AI API.** Personal data stays in the browser's localStorage.
- **Vitest + Testing Library** for tests; **Playwright** (with the installed Google Chrome) for the browser check.

## How the sources are retrieved

| Source | Type | Address pattern | How the date is matched |
|---|---|---|---|
| Soka Gakkai Global – Daily Encouragement | **Primary** (official) | `sokaglobal.org/resources/daily-encouragement/{month}-{day}.html` | The page's date label (e.g. "October 21") and canonical address must match the London date. The page shows no year, so the match is by month and day. |
| Brilliant Brent East SGI blog – "Sensei's Daily Encouragement" | **Secondary** | Blogger JSON feed searched for the date | The post title must name the exact date (e.g. "October 21 2026"), and the Nichiren section's own date line must match. |

**What was checked before building:**
- The official per-date pages exist and return 200 for 1 January, 29 February (leap-day page), 29 March, 21 and 31 December, and the 21 October page's quotation is plain text in the HTML.
- The official `robots.txt` has no rule against these pages; the Nichiren Library `robots.txt` returns 404 (no rules).
- No official daily **Nichiren** calendar was found. The blog chooses a Nichiren passage for each day itself. Its October 21 passage ("General Stone Tiger") matches the Nichiren Library text (WND I, pp. 952–953), but its Gregorian date (22 October 1278) is the blog's own conversion from the lunar date given in the original.
- The blog's *Ikeda* quote for 21 October differs from the official quote, so the app **never** uses the blog for Ikeda text.
- The Nichiren Library has no daily feature; it is linked as the place to read the original writings.

## How source verification works

Each result has one of these statuses (`src/sources/types.ts`):

| Status | Meaning | Shown as |
|---|---|---|
| `verified_today` | Official page for the requested date, date label and address match | "Verified for today" |
| `secondary_date_matched` | Blog post and section dated for today | "Secondary source – date matches today" (never called verified) |
| `date_not_matched` | Page found but labelled for another date | Not shown; explained |
| `no_date_passage` | Source has no passage for this date | "No passage found for this date" |
| `source_unavailable` | Reached but unexpected format or server error | "Source unavailable" |
| `retrieval_failed` | Network error or timeout | "Retrieval failed" |

Rules enforced by code and tests:
- A passage is only shown when its status is `verified_today` or `secondary_date_matched`.
- A failed section never replaces a usable cached one; a cached section keeps its **original** retrieval time and is labelled "Cached copy … not newly retrieved or current".
- Cached content is never used for a different date.
- Each source is retrieved independently; one can succeed while the other fails.
- Source text is converted to plain text and rendered as React text. The app contains no `dangerouslySetInnerHTML` (checked by a test).
- The service worker never caches `/api/` responses, so every tap is a fresh attempt.

## How reflections are generated (without paid AI)

The reflection is produced **on the device** by a template engine (`src/reflection/engine.ts`, themes in `src/reflection/themes.ts`):

1. It looks for theme keywords as whole words in the passage text. A theme is used only when its keyword actually appears. If none does, the reflection says it is a **limited fallback** and does not claim to explain the passage.
2. It chooses the templates for that theme. The choice is a stable hash of the date and the text, so the same passage on the same day gives the same wording.
3. The quoted word in the determination is always a word that appears in the passage (tested for every theme).
4. Your goals (Settings) are added only as your own words, and are never sent anywhere.

It is labelled **"Generated from templates on this device – not a live AI reflection"** everywhere it appears.

Limitation: this is a set of templates, not an understanding of the text. It can only offer what the themes and templates contain.

## Install dependencies on Windows

You need Node.js 20 or newer (this project was built with Node 22.20.0).

1. Install Node.js LTS from https://nodejs.org (accept the defaults).
2. Open **PowerShell** in the project folder (`C:\Users\abil1\daily-gosho`).
3. Run:

```powershell
npm install
```

## Run locally

Two ways:

```powershell
npm run dev
```
This runs the interface only. The `/api/daily` function is not part of Vite, so the app will show "Retrieval failed" for the button. Use the next command to test with live sources.

```powershell
npm run preview:full
```
This builds the app and serves it with Cloudflare's local runner (`wrangler pages dev dist`) at **http://localhost:8788**. Wrangler does not need a Cloudflare login for local use. Open that address in a browser.

## Run the tests

```powershell
npm test
```
Runs the automated tests (89 at the time of writing): date rules, both source parsers (using saved real pages), the function, cache and merge rules, the reflection engine, storage, copy, security and the screens.

Browser test against the running app and **live** sources (needs `npm run preview:full` running in another window, and an internet connection; uses the installed Google Chrome):

```powershell
npm run test:e2e
```

## Build for production

```powershell
npm run build
```
Runs the TypeScript check and builds the app into `dist/`.

## Deploy to Cloudflare Pages (free)

Replace the placeholders with your own names. Do not put any secret key in the project.

1. Create a GitHub repository, e.g. `https://github.com/<your-account>/daily-gosho`, and push this project to it. (Nothing has been pushed by this project; you do this step.)
2. Sign in at https://dash.cloudflare.com, open **Workers & Pages → Create → Pages → Connect to Git**, and choose the repository.
3. Use these build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: set an environment variable `NODE_VERSION` = `22`
4. Deploy. Cloudflare gives you a `https://<project>.pages.dev` address. The `functions/` folder becomes `/api/daily` automatically.
5. Open the address and tap **Get Today's Guidance** to confirm it works.

Note: the `functions/` file is written for Cloudflare Pages. It is not a separate Worker.

## Install on an iPhone (Home Screen)

1. Open your `https://<project>.pages.dev` address in **Safari** (not Chrome; Home Screen install is a Safari feature).
2. Tap the **Share** button (square with an up arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Check the name and tap **Add**. The app opens full screen from its own icon.

## Services and their limits (verify before relying on them)

- **Cloudflare Pages (hosting)**: static files are unlimited and free on the free plan. Pages Functions (the `/api/daily` function) use the Workers free allowance, which Cloudflare's pricing page lists as 100,000 requests per day across Functions and Workers, with 10 ms of CPU time per request. Source: https://developers.cloudflare.com/pages/functions/pricing and https://developers.cloudflare.com/workers/platform/pricing/ (figures taken from a search summary; check the pages before relying on them).
  - Paying for Workers Paid plans starts at a minimum monthly charge; the function stays free only while under the free limits. Going over the free limit can incur charges, so watch the usage dashboard.
- **GitHub**: free for public and private repositories (check GitHub's current plan details before relying on this).
- **Official and blog sites**: not paid services, but they are not ours. The app makes one request per source per tap, with an 8-second timeout. Please do not automate heavy polling.
- **No paid AI API, no paid database, no analytics, no secret keys** are used.
- A **custom domain** is not required and is not set up.

## Known limitations

- **No official daily Nichiren calendar** was found. The Nichiren passage comes from a secondary blog, labelled as such. Choosing other Nichiren writings is **not yet implemented**; the app links to the Nichiren Library for reading the originals.
- **The official page shows no year**, so the Ikeda match is by month and day.
- The **blog's Gregorian date** for a writing is the blog's own conversion, not the original date.
- The **reflection is template-based**. It cannot read unfamiliar passages; it says so with a limited fallback.
- **Personal data is stored in the browser.** It stays on the device, but:
  - Clearing Safari's website data, or using a different browser, removes it.
  - iOS may remove a website's stored data after a period of not using it in Safari. Apps added to the Home Screen are kept better, but this is not guaranteed.
  - The app does not back up or sync data.
- **Offline**: the app's own pages open offline, but a retrieval needs the internet. Cached copies are shown only for days already retrieved on this device.
- **Browser test**: the e2e script was run on Windows with Google Chrome at a 390 px iPhone-sized viewport. It has **not** been run on a real iPhone or in iOS Safari.
- The tab bar scrolls sideways on very narrow screens so the last tab can be cut off; tap-and-slide to reach it.
- Not yet implemented: choosing other Nichiren writings; exporting journal entries; sharing.

## Git

The repository has no commits yet. Nothing has been committed or pushed. When you are ready:

```powershell
git add .
git commit -m "Initial Daily Gosho app"
```
