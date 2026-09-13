#!/usr/bin/env node
/**
 * generate-local-dist.js
 *
 * Reads local dist/providers/{anime|movies}/{id}/create-{id}.js files and
 * emits apps/src/registry/local-dist-map.ts — a static code-string map used
 * by Ext-anime and Ext-movies to skip the GitHub CDN fetch.
 *
 * Run with:  node apps/scripts/generate-local-dist.js
 * Or:        yarn gen:local-dist   (if added to apps/package.json scripts)
 */

const fs = require('fs');
const path = require('path');

// Root of the monorepo (one level up from apps/)
const REPO_ROOT = path.resolve(__dirname, '../..');
const DIST_BASE = path.join(REPO_ROOT, 'dist', 'providers');

// Extension registry — mirrors extension-registry.json entries that have a local dist file.
// Add / remove entries here when the registry changes.
const ENTRIES = [
  // ── Anime ──────────────────────────────────────────────────────────────────
  { id: 'animepahe', category: 'anime', file: 'anime/animepahe/create-animepahe.js' },
  { id: 'animekai', category: 'anime', file: 'anime/animekai/create-animekai.js' },
  { id: 'anikoto', category: 'anime', file: 'anime/anikoto/create-anikoto.js' },
  { id: 'anineko', category: 'anime', file: 'anime/anineko/create-anineko.js' },
  // ── Movies ─────────────────────────────────────────────────────────────────
  { id: 'multimovies', category: 'movies', file: 'movies/multimovies/create-multimovies.js' },
  { id: 'yflix', category: 'movies', file: 'movies/yflix/create-yflix.js' },
  { id: 'vegamovies', category: 'movies', file: 'movies/vegamovies/create-vegamovies.js' },
];

const lines = [];

lines.push('// AUTO-GENERATED — do not edit manually.');
lines.push('// Re-generate with: node apps/scripts/generate-local-dist.js');
lines.push('//');
lines.push('// Maps extension ID → compiled JS code string (from local dist/).');
lines.push('// Used by Ext-anime and Ext-movies to load providers without a CDN fetch.');
lines.push('');
lines.push('export const LOCAL_DIST_MAP: Record<string, string> = {');

let ok = 0;
let missing = 0;

for (const entry of ENTRIES) {
  const fullPath = path.join(DIST_BASE, entry.file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  SKIP  ${entry.id} — not found at ${fullPath}`);
    missing++;
    continue;
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  lines.push(`  // [${entry.category}]`);
  lines.push(`  ${JSON.stringify(entry.id)}: ${JSON.stringify(code)},`);
  lines.push('');
  console.log(`✅ ${entry.id.padEnd(14)} (${(code.length / 1024).toFixed(1)} kB)`);
  ok++;
}

lines.push('};');
lines.push('');
lines.push('export default LOCAL_DIST_MAP;');

const outPath = path.join(__dirname, '../src/registry/local-dist-map.ts');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

console.log('');
console.log(`📦 Generated ${outPath}`);
console.log(`   ${ok} entries bundled, ${missing} skipped.`);
