# Forex Analyzer — Vercel deployment

An educational technical-analysis workbench. Every reading is computed from the
candles you load; nothing is invented, and nothing here is a trade recommendation.

```
.
├── api/candles.js      serverless route — keeps your market-data key off the browser
├── src/App.jsx         the whole dashboard (analysis engine + UI, single file)
├── src/main.jsx        mount point + localStorage shim for the journal
├── index.html
├── vite.config.js
└── package.json
```

## Deploy in about three minutes

### Option A — GitHub (recommended)

1. Push this folder to a new GitHub repo.
2. On vercel.com: **Add New → Project → Import** the repo.
3. Vercel detects Vite automatically. Leave every build setting alone.
4. **Deploy.**

### Option B — CLI

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

## Turn on live data

Both routes work. The server-side one is better — the key never reaches the browser.

### Server-side key (recommended)

In Vercel → **Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `DATA_PROVIDER` | `twelvedata` or `tradermade` |
| `TWELVEDATA_API_KEY` | your key (if using Twelve Data) |
| `TRADERMADE_API_KEY` | your key (if using TraderMade) |

**Redeploy after adding them** — environment variables are baked in at build time.

Then in the app: Chart input → Live feed → provider **"This app's own key (server-side)"** → Fetch.

### Browser-side key

Pick Twelve Data or TraderMade in the provider dropdown and paste a key into the app.
Nothing is stored; the key lives in page memory until you reload. Fine for a private
deployment, wrong for a public one — anyone can read it out of the network tab.

## Symbols

| Provider | Gold symbol | Timeframes |
| --- | --- | --- |
| Twelve Data | `XAU/USD` (with slash) | 1m → Weekly |
| TraderMade | `XAUUSD` (no slash) | 1m → Daily |

The app sends the pair exactly as shown in its dropdown and the server route strips
the slash for TraderMade automatically.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173 — UI only, /api not available
```

To exercise the serverless route locally:

```bash
npm i -g vercel
vercel dev           # runs the app and /api/candles together
```

Put your keys in a `.env` file at the project root for `vercel dev` (already gitignored).

## Rate limits

`/api/candles` sets a short CDN cache — roughly a tenth of one bar's duration — so a
burst of refreshes doesn't spend a burst of API calls. Free tiers are usually a few
calls per minute; if you enable auto-refresh at 60s, that is most of your budget.

## If the build fails on Vercel

The real error is 5-15 lines above `Command "npm run build" exited with 1` in the
build log. Two causes account for most of them, and both are already handled here:

- **`vite: not found`** — happens when Vercel installs production dependencies
  only. `vite` and `@vitejs/plugin-react` are in `dependencies` (not
  `devDependencies`) in this package, so the build works either way.
- **Node too old** — Vite 5 needs Node 18+. `engines.node` is set. If your project
  is pinned lower, change it in Settings -> General -> Node.js Version.

Other things worth checking:

- `package.json` must sit at the **repository root**, not inside a subfolder. If it
  is nested, set Root Directory in Vercel to that folder.
- Filenames are case-sensitive on Vercel's Linux builders. `src/App.jsx` must be
  capitalised exactly as the import in `src/main.jsx` writes it.
- Delete `package-lock.json` and let Vercel regenerate it if you see `EUSAGE` or
  lockfile-sync errors.

## Notes

- No Tailwind, no UI library. All styling is a single CSS block inside `App.jsx`.
- The journal persists to `localStorage` via the shim in `main.jsx`.
- The data-source badge is load-bearing: illustrative sample data is never
  presented as live, and a live snapshot older than two bars flags itself as stale.
