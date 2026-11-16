/**
 * Publishes every registry entry to an immutable, versioned path and refreshes its hash.
 *
 *   registry/extensions/<id>/<version>.js
 *   registry/extractors/<name>/<version>.js
 *
 * A published file is never overwritten: if an entry's build output (`distFile`) changed but its
 * `version` is already published with different content, this exits with an error asking for a
 * version bump. That keeps what every published registry entry serves stable (REG-1). Then it
 * writes the example app's local dist map (apps/scripts/generate-local-dist.js) from the bundles.
 *
 * Every problem exits 1 before anything is written: a missing build output, a malformed id,
 * version or distFile, and a `main` URL in an unknown format. `main` is generated, so a new entry
 * leaves it out; otherwise it must be this repo's published URL for the same entry.
 *
 * Run after `yarn build`; `yarn build:registry` runs both (scripts/build-registry.js).
 *
 * Usage:
 *   node scripts/prepare-registry.js          publish new versions, update src + dist registry
 *   node scripts/prepare-registry.js --check  verify only (no writes); exits 1 on any problem.
 *       Also checks that every published file referenced by the current registry or by a
 *       supported release's bundled registry still exists (see scripts/registry-retention.js),
 *       and that the local dist map is current.
 *   node scripts/prepare-registry.js --check --base <commit>
 *       Also compares with the registry at <commit>: an entry whose sha256 changed needs a higher
 *       version, versions never go backwards, and files published at <commit> are unchanged.
 *       CI passes the commit the change is based on.
 *   --check also reports whether src/extension-registry.json.sig is valid for the registry under the
 *   keys in src/registry-signing-keys.json (REG-6). A stale signature is only a note: CI re-signs the
 *   registry after it reaches main (.github/workflows/sign-registry.yml).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  REGISTRY_FILE,
  DIST_REGISTRY_FILE,
  built,
  readRegistry,
  registryLayout,
  isBundleFile,
} = require('./registry-paths');
const { checkBase, checkReferences } = require('./registry-retention');
const { checkSignature } = require('./registry-signing');
const {
  LOCAL_DIST_MAP_FILE,
  isLocalDistMapCurrent,
  writeLocalDistMap,
} = require('../apps/scripts/generate-local-dist');

const USAGE = 'usage: node scripts/prepare-registry.js [--check [--base <commit>]]';

function parseArgs(argv) {
  const options = { check: false, base: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--base') options.base = argv[++i] ?? '';
    else if (arg.startsWith('--base=')) options.base = arg.slice('--base='.length);
    else fail(`unknown argument ${arg}\n${USAGE}`);
  }
  if (options.base !== undefined && !options.check) fail(`--base needs --check\n${USAGE}`);
  return options;
}

function fail(message) {
  console.error(`prepare-registry: ${message}`);
  process.exit(1);
}

const options = parseArgs(process.argv.slice(2));
const checkOnly = options.check;

let schema;
let layout;
try {
  schema = built('utils/registry-schema');
  layout = registryLayout();
} catch (error) {
  fail(error.message);
}

const sha256 = (content) => crypto.createHash('sha256').update(content, 'utf8').digest('hex');
const problems = [];
const writes = [];

/** Whether `main` is unset (a new entry) or this repo's URL of a published version of the same entry. */
function isOwnUrl(kind, entry) {
  if (entry.main === undefined || entry.main === '') return true;
  const published = layout.parsePublishedFile(entry.main);
  return (
    published !== undefined &&
    `${published.kind}/${published.key}` === layout.entryKey(kind, entry) &&
    entry.main === layout.publishedUrl(published.file)
  );
}

function publish(kind, entry) {
  const label = `${layout.entryKey(kind, entry)}@${entry.version}`;

  const file = layout.publishedFile(kind, entry);
  if (!file) {
    problems.push(`${label}: id/name and version must form a published path (registry/${kind}/<key>/<x.y.z>.js)`);
    return entry;
  }
  const main = layout.publishedUrl(file);
  if (!isOwnUrl(kind, entry)) {
    const expected = main.replace(/[^/]+\.js$/, '<version>.js');
    problems.push(
      `${label}: unknown main URL format (${entry.main}); expected ${expected}, or leave it out for a new entry`
    );
    return entry;
  }

  const { distFile } = entry;
  if (!isBundleFile(distFile)) {
    problems.push(`${label}: distFile must be a .js bundle under dist/bundles/ (got ${distFile})`);
    return entry;
  }
  const distAbs = path.join(repoRoot, distFile);
  if (!fs.existsSync(distAbs)) {
    problems.push(`${label}: build output not found at ${distFile} (run yarn build)`);
    return entry;
  }

  const code = fs.readFileSync(distAbs, 'utf8');
  const hash = sha256(code);
  const fileAbs = path.join(repoRoot, file);

  if (fs.existsSync(fileAbs)) {
    if (sha256(fs.readFileSync(fileAbs, 'utf8')) !== hash) {
      problems.push(`${label}: ${distFile} changed but ${entry.version} is already published; bump the version`);
      return entry;
    }
  } else if (checkOnly) {
    problems.push(`${label}: ${file} is not published (run node scripts/prepare-registry.js)`);
    return entry;
  } else {
    writes.push({ file, code });
  }

  if (checkOnly && (entry.main !== main || entry.sha256 !== hash)) {
    problems.push(`${label}: registry entry is out of date (run node scripts/prepare-registry.js)`);
  }
  return { ...entry, main, sha256: hash };
}

const registry = readRegistry();
for (const kind of layout.kinds) registry[kind] = registry[kind].map((entry) => publish(kind, entry));

// Check the result against the library's own registry schema (REG-4), after publishing filled in
// main and sha256.
try {
  schema.validateRegistry(registry);
} catch (error) {
  problems.push(...(error.issues || [error.message]));
}

if (checkOnly) {
  const references = checkReferences(registry);
  problems.push(...references.problems);
  references.notes.forEach((note) => console.log(`  · ${note}`));

  if (options.base !== undefined) {
    const base = checkBase(registry, options.base);
    problems.push(...base.problems);
    base.notes.forEach((note) => console.log(`  · ${note}`));
  }

  const signature = checkSignature();
  problems.push(...signature.problems);
  signature.notes.forEach((note) => console.log(`  · ${note}`));

  if (!problems.length && !isLocalDistMapCurrent(registry)) {
    problems.push(`${LOCAL_DIST_MAP_FILE} is out of date (run node scripts/prepare-registry.js)`);
  }
}

if (problems.length) {
  console.error(`Registry has ${problems.length} problem(s):\n${problems.map((p) => `  ✖ ${p}`).join('\n')}`);
  process.exit(1);
}

if (checkOnly) {
  console.log('Registry is consistent: every entry points at its published version and matches its build.');
  process.exit(0);
}

for (const { file, code } of writes) {
  fs.mkdirSync(path.dirname(path.join(repoRoot, file)), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, file), code);
  console.log(`  + published ${file}`);
}

const content = JSON.stringify(registry, null, 2);
fs.mkdirSync(path.dirname(path.join(repoRoot, DIST_REGISTRY_FILE)), { recursive: true });
fs.writeFileSync(path.join(repoRoot, REGISTRY_FILE), content);
fs.writeFileSync(path.join(repoRoot, DIST_REGISTRY_FILE), content);
const map = writeLocalDistMap(registry);
if (map.changed) console.log(`  + wrote ${LOCAL_DIST_MAP_FILE} (${map.bundles} bundles)`);
console.log('\nRegistry prepared: entries point at immutable versioned files.');
