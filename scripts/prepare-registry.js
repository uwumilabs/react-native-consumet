/**
 * Publishes every registry entry to an immutable, versioned path and refreshes its hash.
 *
 *   registry/extensions/<id>/<version>.js
 *   registry/extractors/<name>/<version>.js
 *
 * A published file is never overwritten: if an entry's build output (`distFile`) changed but its
 * `version` is already published with different content, this exits with an error asking for a
 * version bump. That keeps what every published registry entry serves stable (REG-1).
 *
 * Every problem exits 1 before anything is written: a missing build output, a malformed id,
 * version or distFile, and a `main` URL in an unknown format. `main` is generated, so a new entry
 * leaves it out; otherwise it must be this repo's published URL for the same entry, or an older
 * dist URL from before versioned paths.
 *
 * Usage:
 *   node scripts/prepare-registry.js          publish new versions, update src + dist registry
 *   node scripts/prepare-registry.js --check  verify only (no writes); exits 1 on any problem.
 *       Also checks that every published file referenced by the current registry or by a
 *       supported release's bundled registry still exists (see scripts/registry-support.js).
 *   node scripts/prepare-registry.js --check --base <commit>
 *       Also compares with the registry at <commit>: an entry whose sha256 changed needs a higher
 *       version, versions never go backwards, and files published at <commit> are unchanged.
 *       CI passes the commit the change is based on.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { checkBase, checkReferences } = require('./registry-support');

const repoRoot = path.join(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'extension-registry.json');
const distRegistryPath = path.join(repoRoot, 'dist', 'extension-registry.json');
const RAW_REPO = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet';
const RAW_BASE = `${RAW_REPO}/refs/heads/main`;

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

const sha256 = (content) => crypto.createHash('sha256').update(content, 'utf8').digest('hex');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const problems = [];
const writes = [];

// Entries created before versioned paths pointed `main` straight at their dist file.
const LEGACY_DIST_URL = new RegExp(`^${escape(RAW_REPO)}/refs/heads/[^/]+/(dist/.+\\.js)$`);
const legacyDistFile = (main) => LEGACY_DIST_URL.exec(main || '')?.[1];

/** A repo-relative .js file under dist/, with no empty, `.` or `..` segments. */
function isDistFile(file) {
  const segments = typeof file === 'string' ? file.split('/') : [];
  return (
    segments.length > 1 &&
    segments[0] === 'dist' &&
    file.endsWith('.js') &&
    segments.every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== '.' && segment !== '..')
  );
}

/** Why `main` isn't a URL this script wrote (or a legacy dist URL), or undefined if it is. */
function unknownMain(main, kind, key) {
  if (main === undefined || main === '') return undefined;
  if (typeof main !== 'string') return 'main must be a string';
  if (legacyDistFile(main)) return undefined;
  if (new RegExp(`^${escape(`${RAW_BASE}/registry/${kind}/${key}/`)}\\d+\\.\\d+\\.\\d+\\.js$`).test(main)) {
    return undefined;
  }
  return `unknown main URL format (${main}); expected ${RAW_BASE}/registry/${kind}/${key}/<version>.js, or leave it out for a new entry`;
}

function publish(entry, kind, key) {
  const label = `${kind}/${key}@${entry.version}`;

  if (!/^[a-z0-9-]+$/.test(key)) {
    problems.push(`${label}: id/name must be lowercase letters, digits or dashes to form a path`);
    return entry;
  }
  if (!/^\d+\.\d+\.\d+$/.test(entry.version || '')) {
    problems.push(`${label}: version must be semver (x.y.z)`);
    return entry;
  }
  const mainProblem = unknownMain(entry.main, kind, key);
  if (mainProblem) {
    problems.push(`${label}: ${mainProblem}`);
    return entry;
  }

  const distFile = entry.distFile || legacyDistFile(entry.main);
  if (!distFile) {
    problems.push(`${label}: no distFile, and main is not a dist URL (${entry.main})`);
    return entry;
  }
  if (!isDistFile(distFile)) {
    problems.push(`${label}: distFile must be a .js file under dist/ (got ${distFile})`);
    return entry;
  }
  const distAbs = path.join(repoRoot, distFile);
  if (!fs.existsSync(distAbs)) {
    problems.push(`${label}: build output not found at ${distFile} (run yarn build)`);
    return entry;
  }

  const code = fs.readFileSync(distAbs, 'utf8');
  const hash = sha256(code);
  const versionedRel = `registry/${kind}/${key}/${entry.version}.js`;
  const versionedAbs = path.join(repoRoot, versionedRel);

  if (fs.existsSync(versionedAbs)) {
    if (sha256(fs.readFileSync(versionedAbs, 'utf8')) !== hash) {
      problems.push(`${label}: ${distFile} changed but ${entry.version} is already published; bump the version`);
      return entry;
    }
  } else if (checkOnly) {
    problems.push(`${label}: ${versionedRel} is not published (run node scripts/prepare-registry.js)`);
    return entry;
  } else {
    writes.push({ file: versionedRel, code });
  }

  const updated = { ...entry, main: `${RAW_BASE}/${versionedRel}`, sha256: hash, distFile };
  if (checkOnly && (entry.main !== updated.main || entry.sha256 !== updated.sha256 || entry.distFile !== distFile)) {
    problems.push(`${label}: registry entry is out of date (run node scripts/prepare-registry.js)`);
  }
  return updated;
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
registry.extensions = registry.extensions.map((e) => publish(e, 'extensions', String(e.id).toLowerCase()));
registry.extractors = registry.extractors.map((e) => publish(e, 'extractors', String(e.name).toLowerCase()));

// Check the result against the library's own registry schema (REG-4), after publishing filled in
// main and sha256. The built module has no runtime requires, so it loads without an install.
const schemaModule = path.join(repoRoot, 'dist', 'utils', 'registry-schema.js');
if (fs.existsSync(schemaModule)) {
  try {
    require(schemaModule).validateRegistry(registry);
  } catch (error) {
    problems.push(...(error.issues || [error.message]));
  }
} else {
  problems.push('dist/utils/registry-schema.js not found (run yarn build)');
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
fs.mkdirSync(path.dirname(distRegistryPath), { recursive: true });
fs.writeFileSync(registryPath, content);
fs.writeFileSync(distRegistryPath, content);
console.log('\nRegistry prepared: entries point at immutable versioned files.');
