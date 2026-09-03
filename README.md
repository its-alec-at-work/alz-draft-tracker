# alz-draft-tracker

A reusable fantasy football draft board. Search players, build a favorites queue,
mark your own picks **Drafted** and other teams' picks **Gone**, and always see who's
left. State is saved in the browser, so you can close the tab and resume mid-draft.

Responsive: a dense multi-column list on desktop, a stacked two-line layout with
large tap targets on phones. Light and dark themes follow the device.

## Run locally

```bash
npm start        # serves at http://localhost:8080
```

Or just open `index.html` in a browser (note: browsers disable `localStorage` for
`file://` pages, so session persistence only works when it's served over http(s)).

## Deploy

`npm run build` writes the deployable static site to `public/` (`index.html` +
`players.json`). Point any static host at that directory.

**Vercel** — `vercel.json` is committed and already sets this up (`buildCommand:
npm run build`, `outputDirectory: public`). Just import the repo; no dashboard config
needed.

**Anything else** (Netlify, GitHub Pages, Cloudflare Pages, S3, plain nginx) — run
`npm run build` and upload the `public/` folder, or upload the repo-root `index.html`
directly since it carries the same embedded data.

Saved drafts live in `localStorage`, which is per-browser and per-domain — a draft on
your laptop won't sync to your phone, and each deploy origin has its own storage.

## Updating the rankings

The player data is embedded directly in `index.html`. To refresh it:

1. Replace `compiled_rankings.csv` with a new file using the same columns:
   `Position,Name,Team,CompositeAvgRank,PositionTier,SourceCount`
2. Run the build:

   ```bash
   npm run build
   ```

This re-parses the CSV, rewrites `players.json`, re-embeds the data into `index.html`,
and refreshes `public/`.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The entire app — markup, styles, logic, and embedded player data |
| `compiled_rankings.csv` | Source rankings (composite average across expert sources) |
| `players.json` | Generated dataset (also embedded in `index.html`) |
| `scripts/build.mjs` | Regenerates `players.json`, the embedded data, and `public/` from the CSV |
| `vercel.json` | Vercel build + output-directory config |
| `public/` | Build output (git-ignored) |
