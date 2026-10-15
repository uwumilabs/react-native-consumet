/**
 * Shared rules for the immutable registry files under registry/.
 *
 * Supported releases: every stable `vX.Y.Z` tag in the two most recent minor lines
 * (e.g. with v1.6.2 as the latest release, all v1.6.* and v1.5.* tags). Their bundled
 * src/extension-registry.json files decide which published versions must stay downloadable.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const SUPPORTED_MINOR_LINES = 2;
const KINDS = ['extensions', 'extractors'];

const VERSIONED_PATH = /\/(registry\/(extensions|extractors)\/([a-z0-9-]+)\/(\d+\.\d+\.\d+)\.js)$/;

/** The repo-relative published file a registry URL points at, or undefined for older dist URLs. */
function versionedPath(main) {
  return VERSIONED_PATH.exec(main || '')?.[1];
}

function parseSemver(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? match.slice(1).map(Number) : undefined;
}

function compareSemver(a, b) {
  const [x, y] = [parseSemver(a), parseSemver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

const git = (...args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/** Stable release tags (`vX.Y.Z`), oldest first. Empty when tags weren't fetched. */
function releaseTags() {
  let output = '';
  try {
    output = git('tag', '--list', 'v*');
  } catch {
    return [];
  }
  return output
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => parseSemver(tag))
    .sort(compareSemver);
}

/** Tags of supported releases: all stable tags in the latest SUPPORTED_MINOR_LINES minor lines. */
function supportedTags(tags = releaseTags()) {
  const lines = [...new Set(tags.map((tag) => parseSemver(tag).slice(0, 2).join('.')))];
  const supportedLines = new Set(lines.slice(-SUPPORTED_MINOR_LINES));
  return tags.filter((tag) => supportedLines.has(parseSemver(tag).slice(0, 2).join('.')));
}

/** The registry bundled in a release tag, or undefined if the tag has none. */
function tagRegistry(tag) {
  try {
    return JSON.parse(git('show', `${tag}:src/extension-registry.json`));
  } catch {
    return undefined;
  }
}

const entriesOf = (registry) => [...(registry.extensions || []), ...(registry.extractors || [])];

/**
 * Every published file referenced by the current registry or a supported release, checking
 * that each still exists. Registries from before immutable versions point into dist/ and are
 * reported as legacy, since there is no published file to keep for them.
 */
function checkReferences(currentRegistry) {
  const tags = releaseTags();
  const sources = [
    { label: 'current registry', registry: currentRegistry },
    ...supportedTags(tags).map((tag) => ({ label: tag, registry: tagRegistry(tag) })),
  ];
  const referenced = new Set();
  const problems = [];
  const notes = [];

  if (!tags.length) notes.push('no release tags found; fetch them (git fetch --tags) to check supported releases');

  for (const { label, registry } of sources) {
    if (!registry) {
      notes.push(`${label}: no bundled registry`);
      continue;
    }
    let legacy = 0;
    for (const entry of entriesOf(registry)) {
      const file = versionedPath(entry.main);
      if (!file) {
        legacy++;
        continue;
      }
      referenced.add(file);
      if (!fs.existsSync(path.join(repoRoot, file))) {
        problems.push(`${label}: ${entry.id || entry.name}@${entry.version} points at missing ${file}`);
      }
    }
    if (legacy) notes.push(`${label}: ${legacy} entries predate immutable versions (dist URLs); nothing to keep`);
  }

  return { tags, referenced, problems, notes };
}

/** All published files as { kind, key, version, file }. */
function publishedFiles() {
  const files = [];
  for (const kind of KINDS) {
    const kindDir = path.join(repoRoot, 'registry', kind);
    if (!fs.existsSync(kindDir)) continue;
    for (const key of fs.readdirSync(kindDir)) {
      for (const name of fs.readdirSync(path.join(kindDir, key))) {
        const version = name.replace(/\.js$/, '');
        if (parseSemver(version)) files.push({ kind, key, version, file: `registry/${kind}/${key}/${name}` });
      }
    }
  }
  return files;
}

/**
 * Retention rule. A published version is kept if any of these hold:
 *   - it is the current version of its entry in the current registry
 *   - it is the newest published version before the current one (kept for one-line rollbacks)
 *   - the bundled registry of a supported release references it
 * Everything else may be deleted.
 *
 * @param currentRegistry parsed src/extension-registry.json
 * @param files result of publishedFiles()
 * @param supportedRegistries [{ tag, registry }] for each supported release
 */
function planPrune(currentRegistry, files, supportedRegistries) {
  const keep = new Map();
  const addReason = (file, reason) => keep.set(file, [...(keep.get(file) || []), reason]);

  for (const entry of entriesOf(currentRegistry)) {
    const current = versionedPath(entry.main);
    if (!current) continue;
    addReason(current, 'current');

    const [, kind, key] = current.split('/');
    const older = files
      .filter((f) => f.kind === kind && f.key === key && compareSemver(f.version, entry.version) < 0)
      .sort((a, b) => compareSemver(a.version, b.version));
    if (older.length) addReason(older[older.length - 1].file, 'previous version (rollback)');
  }

  for (const { tag, registry } of supportedRegistries) {
    for (const entry of entriesOf(registry || {})) {
      const file = versionedPath(entry.main);
      if (file) addReason(file, `referenced by ${tag}`);
    }
  }

  return { keep, deletable: files.filter((f) => !keep.has(f.file)) };
}

module.exports = {
  repoRoot,
  SUPPORTED_MINOR_LINES,
  versionedPath,
  compareSemver,
  releaseTags,
  supportedTags,
  tagRegistry,
  checkReferences,
  publishedFiles,
  planPrune,
};
