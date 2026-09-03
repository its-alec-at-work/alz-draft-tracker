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
const builtHtml = src.replace(re, `$1\n${json}\n$2`);

// Keep the working copy (root) in sync so `file://` / `npm start` stay current...
writeFileSync(HTML, builtHtml);
writeFileSync(JSON_OUT, json + "\n");

// ...and emit the static site Vercel serves.
mkdirSync(PUBLIC, { recursive: true });
writeFileSync(join(PUBLIC, "index.html"), builtHtml);
writeFileSync(join(PUBLIC, "players.json"), json + "\n");

const byPos = players.reduce((m, p) => ((m[p.pos] = (m[p.pos] || 0) + 1), m), {});
console.log(`Embedded ${players.length} players → index.html and public/`);
console.log(Object.entries(byPos).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
