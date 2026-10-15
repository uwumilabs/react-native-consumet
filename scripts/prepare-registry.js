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
 * Usage:
 *   node scripts/prepare-registry.js          publish new versions, update src + dist registry
 *   node scripts/prepare-registry.js --check  verify only (no writes); exits 1 on any problem
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'extension-registry.json');
const distRegistryPath = path.join(repoRoot, 'dist', 'extension-registry.json');
const RAW_BASE = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/refs/heads/main';
const checkOnly = process.argv.includes('--check');

const sha256 = (content) => crypto.createHash('sha256').update(content, 'utf8').digest('hex');
const problems = [];

// Entries created before versioned paths pointed `main` straight at their dist file.
const legacyDistFile = (main) => /\/refs\/heads\/[^/]+\/(dist\/.+\.js)$/.exec(main || '')?.[1];

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

  const distFile = entry.distFile || legacyDistFile(entry.main);
  if (!distFile) {
    problems.push(`${label}: no distFile, and main is not a dist URL (${entry.main})`);
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
    fs.mkdirSync(path.dirname(versionedAbs), { recursive: true });
    fs.writeFileSync(versionedAbs, code);
    console.log(`  + published ${versionedRel}`);
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

if (problems.length) {
  console.error(`Registry has ${problems.length} problem(s):\n${problems.map((p) => `  ✖ ${p}`).join('\n')}`);
  process.exit(1);
}

if (checkOnly) {
  console.log('Registry is consistent: every entry points at its published version and matches its build.');
  process.exit(0);
}

const content = JSON.stringify(registry, null, 2);
fs.mkdirSync(path.dirname(distRegistryPath), { recursive: true });
fs.writeFileSync(registryPath, content);
fs.writeFileSync(distRegistryPath, content);
console.log('\nRegistry prepared: entries point at immutable versioned files.');
