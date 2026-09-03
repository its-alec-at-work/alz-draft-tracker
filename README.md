# alz-draft-tracker

A reusable fantasy football draft board. Search players, build a favorites queue,
mark your own picks **Drafted** and other teams' picks **Gone**, and always see who's
left. State is saved in the browser, so you can close the tab and resume mid-draft.

## Run locally

```bash
npm start        # serves at http://localhost:8080
```

Or just open `index.html` in a browser (note: browsers disable `localStorage` for
`file://` pages, so session persistence only works when it's served over http(s)).

## Deploy

It's a single self-contained static file. Push `index.html` (plus its siblings) to any
static host — Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, etc. No build step
or server is required to serve it.

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

This re-parses the CSV, rewrites `players.json`, and re-embeds the data into
`index.html`.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The entire app — markup, styles, logic, and embedded player data |
| `compiled_rankings.csv` | Source rankings (composite average across expert sources) |
| `players.json` | Generated dataset (also embedded in `index.html`) |
| `scripts/build.mjs` | Regenerates `players.json` and the embedded data from the CSV |
