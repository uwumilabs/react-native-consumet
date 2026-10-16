#!/usr/bin/env node
/**
 * generate-local-dist.js
 *
 * Reads each extension's build output (its `distFile` in src/extension-registry.json, the file
 * its registry `sha256` is computed from) and emits apps/src/registry/local-dist-map.ts, a static
 * code-string map that the example app's "Local dist" mode runs instead of fetching `main`.
 * The app still checks that code against the entry's `sha256`, so a stale map shows up as an
 * integrity mismatch.
 *
 * Run after `yarn build` (and `node scripts/prepare-registry.js` when the hashes changed) with:
 *   yarn example gen:local-dist
 * or:
 *   node apps/scripts/generate-local-dist.js
 */

const fs = require('fs');
const path = require('path');

// Root of the monorepo (one level up from apps/)
const REPO_ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'src', 'extension-registry.json');
const { extensions } = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

const lines = [];

lines.push('// AUTO-GENERATED — do not edit manually.');
lines.push('// Re-generate with: yarn example gen:local-dist');
lines.push('//');
lines.push("// Maps extension ID → compiled JS code string (each registry entry's distFile).");
lines.push('// Used by the Registry tab\'s "Local dist" mode, which checks it against the registry sha256.');
lines.push('');
lines.push('export const LOCAL_DIST_MAP: Record<string, string> = {');

let ok = 0;
let missing = 0;

for (const entry of extensions) {
  const fullPath = entry.distFile && path.join(REPO_ROOT, entry.distFile);
  if (!fullPath || !fs.existsSync(fullPath)) {
    console.warn(`⚠️  SKIP  ${entry.id} — ${fullPath ? `not found at ${fullPath}` : 'no distFile'}`);
    missing++;
    continue;
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  lines.push(`  // [${entry.category}] ${entry.distFile}`);
  lines.push(`  ${JSON.stringify(entry.id)}: ${JSON.stringify(code)},`);
  lines.push('');
  console.log(`✅ ${entry.id.padEnd(14)} (${(code.length / 1024).toFixed(1)} kB)`);
  ok++;
}

lines.push('};');
lines.push('');
lines.push('export default LOCAL_DIST_MAP;');
lines.push('');

const outPath = path.join(__dirname, '../src/registry/local-dist-map.ts');

// Format with the repo's prettier config when it's installed, so the file passes `prettier --check`.
// Only the quoting of the code strings changes, not their values (or hashes).
async function format(source) {
  try {
    const prettier = require('prettier');
    const options = (await prettier.resolveConfig(outPath)) ?? {};
    return await prettier.format(source, { ...options, filepath: outPath });
  } catch (error) {
    console.warn(`⚠️  prettier unavailable (${error.message}); writing unformatted output`);
    return source;
  }
}

format(lines.join('\n')).then((source) => {
  fs.writeFileSync(outPath, source, 'utf8');
  console.log('');
  console.log(`📦 Generated ${outPath}`);
  console.log(`   ${ok} entries bundled, ${missing} skipped.`);
});
