#!/usr/bin/env node
/**
 * Regenerates the player dataset from compiled_rankings.csv and embeds it into
 * index.html (inside <script id="player-data">) so the app stays a single
 * self-contained static file. Also writes players.json for standalone use.
 *
 * Usage: npm run build   (or: node scripts/build.mjs)
 *
 * Drop a new compiled_rankings.csv with the same columns each season and re-run.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV = join(root, "compiled_rankings.csv");
const HTML = join(root, "index.html");
const JSON_OUT = join(root, "players.json");
const PUBLIC = join(root, "public"); // static deploy output (Vercel outputDirectory)

const EXPECTED_HEADER = ["Position", "Name", "Team", "CompositeAvgRank", "PositionTier", "SourceCount"];

/** Minimal CSV parser — handles quoted fields and embedded commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV, "utf8");
const [header, ...lines] = parseCsv(raw);

if (header.join(",") !== EXPECTED_HEADER.join(",")) {
  console.error("Unexpected CSV header.\n  expected:", EXPECTED_HEADER.join(", "), "\n  got:     ", header.join(", "));
  process.exit(1);
}

const players = lines.map((cols, idx) => {
  const [pos, name, team, rank, tier, sources] = cols;
  const rec = {
    pos: pos.trim(),
    name: name.trim(),
    team: team.trim(),
    rank: Number(rank),
    tier: Number(tier),
    sources: Number(sources),
  };
  for (const [k, v] of Object.entries(rec)) {
    if (v === "" || (typeof v === "number" && Number.isNaN(v))) {
      console.error(`Row ${idx + 2}: bad value for "${k}" —`, cols.join(","));
      process.exit(1);
    }
  }
  return rec;
});

const json = JSON.stringify(players);

const src = readFileSync(HTML, "utf8");
const re = /(<script id="player-data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!re.test(src)) {
  console.error('Could not find <script id="player-data"> block in index.html');
  process.exit(1);
}
const embedded = src.replace(re, `$1\n${json}\n$2`);

// The root index.html is the source/fragment (also published as an Artifact, which
// wraps it in its own <head> and reads the <title> from it). Keep its data current.
writeFileSync(HTML, embedded);
writeFileSync(JSON_OUT, json + "\n");

// public/ is the deployable static site: a complete, mobile-ready HTML document.
// Lift <title> into <head>; everything else becomes the <body>.
const titleMatch = embedded.match(/<title>([\s\S]*?)<\/title>\s*/i);
const pageTitle = titleMatch ? titleMatch[1].trim() : "Draft Room Board";
const bodyHtml = titleMatch ? embedded.replace(titleMatch[0], "") : embedded;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${pageTitle}</title>
<meta name="color-scheme" content="light dark">
<meta name="description" content="Fantasy football draft board — search players, favorite targets, and track who's been drafted.">
<meta name="theme-color" content="#eceee7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c1210" media="(prefers-color-scheme: dark)">
</head>
<body>
${bodyHtml}
</body>
</html>
`;

mkdirSync(PUBLIC, { recursive: true });
writeFileSync(join(PUBLIC, "index.html"), page);
writeFileSync(join(PUBLIC, "players.json"), json + "\n");

const byPos = players.reduce((m, p) => ((m[p.pos] = (m[p.pos] || 0) + 1), m), {});
console.log(`Embedded ${players.length} players → index.html and public/`);
console.log(Object.entries(byPos).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
