/**
 * Which published registry files must stay, and what a change may do to them (used by
 * prepare-registry.js --check and prune-registry.js).
 *
 * Supported releases: every stable `vX.Y.Z` tag in the two most recent minor lines (e.g. with
 * v1.6.2 as the latest release, all v1.6.* and v1.5.* tags). Their bundled
 * src/extension-registry.json files decide which published versions must stay downloadable.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { repoRoot, REGISTRY_FILE, registryLayout } = require('./registry-paths');

const SUPPORTED_MINOR_LINES = 2;

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
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Stable release tags (`vX.Y.Z`), oldest first. Empty when tags weren't fetched. */
function releaseTags() {
  return git('tag', '--list', 'v*')
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

/** The registry bundled at `commit`, or undefined if it has none. Throws if it isn't JSON. */
function registryAt(commit) {
  let text;
  try {
    text = git('show', `${commit}:${REGISTRY_FILE}`);
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${commit}:${REGISTRY_FILE} is not valid JSON (${error.message})`);
  }
}

/**
 * Every published file referenced by the current registry or a supported release, checking
 * that each still exists. Registries from before immutable versions point into dist/ and are
 * noted as legacy, since there is no published file to keep for them.
 */
function checkReferences(currentRegistry) {
  const { entriesOf, parsePublishedFile } = registryLayout();
  const tags = releaseTags();
  const referenced = new Set();
  const problems = [];
  const notes = [];

  if (!tags.length) notes.push('no release tags found; fetch them (git fetch --tags) to check supported releases');

  const sources = [{ label: 'current registry', registry: currentRegistry }];
  for (const tag of supportedTags(tags)) {
    try {
      sources.push({ label: tag, registry: registryAt(tag) });
    } catch (error) {
      problems.push(error.message);
    }
  }

  for (const { label, registry } of sources) {
    if (!registry) {
      notes.push(`${label}: no bundled registry`);
      continue;
    }
    let legacy = 0;
    for (const { entry } of entriesOf(registry)) {
      const published = parsePublishedFile(entry.main);
      if (!published) {
        legacy++;
        continue;
      }
      referenced.add(published.file);
      if (!fs.existsSync(path.join(repoRoot, published.file))) {
        problems.push(`${label}: ${entry.id || entry.name}@${entry.version} points at missing ${published.file}`);
      }
    }
    if (legacy) notes.push(`${label}: ${legacy} entries predate immutable versions (dist URLs); nothing to keep`);
  }

  return { tags, referenced, problems, notes };
}

const ZERO_COMMIT = /^0+$/;
const short = (text) => String(text).slice(0, 12);

/**
 * Compares the registry (and registry/ on disk) with those at `base`, the commit a change builds on:
 *   - an entry whose sha256 changed must have a higher version than at `base`
 *   - versions never go backwards
 *   - files already published at `base` are unchanged (adding and deleting files is allowed;
 *     checkReferences catches deleting one that is still needed)
 * An empty or all-zero `base` (no previous commit, e.g. a new branch) skips the comparison.
 */
function checkBase(currentRegistry, base) {
  const problems = [];
  const notes = [];

  if (!base || ZERO_COMMIT.test(base)) {
    notes.push('no base commit given; skipped the version bump check');
    return { problems, notes };
  }
  let commit;
  try {
    commit = git('rev-parse', '--verify', '--quiet', `${base}^{commit}`).trim();
  } catch {
    problems.push(`base ${base} is not a commit in this clone; fetch it (or full history) first`);
    return { problems, notes };
  }

  let baseRegistry;
  try {
    baseRegistry = registryAt(commit);
  } catch (error) {
    problems.push(error.message);
    return { problems, notes };
  }
  if (!baseRegistry) {
    notes.push(`base ${short(commit)} has no ${REGISTRY_FILE}; skipped the version bump check`);
    return { problems, notes };
  }

  const { entriesOf, entryKey } = registryLayout();
  const keyed = (registry) => new Map(entriesOf(registry).map(({ kind, entry }) => [entryKey(kind, entry), entry]));
  const before = keyed(baseRegistry);
  for (const [key, entry] of keyed(currentRegistry)) {
    const previous = before.get(key);
    if (!previous || !parseSemver(entry.version || '') || !parseSemver(previous.version || '')) continue;
    const order = compareSemver(entry.version, previous.version);
    if (order < 0) {
      problems.push(`${key}: version went backwards from ${previous.version} to ${entry.version}`);
    } else if (order === 0 && previous.sha256 && entry.sha256 !== previous.sha256) {
      problems.push(
        `${key}@${entry.version}: sha256 changed (${short(previous.sha256)} -> ${short(entry.sha256)}) ` +
          'without a version bump'
      );
    }
  }

  const changed = git('diff', '--name-status', '--no-renames', commit, '--', 'registry/')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'));
  for (const [status, file] of changed) {
    if (status !== 'A' && status !== 'D') {
      problems.push(`${file}: published at ${short(commit)} and changed since; publish a new version instead`);
    }
  }

  return { problems, notes };
}

/** All published files on disk, as { kind, key, version, file }. */
function listPublished() {
  const { kinds, parsePublishedFile } = registryLayout();
  const files = [];
  for (const kind of kinds) {
    const kindDir = path.join(repoRoot, 'registry', kind);
    if (!fs.existsSync(kindDir)) continue;
    for (const key of fs.readdirSync(kindDir)) {
      for (const name of fs.readdirSync(path.join(kindDir, key))) {
        const published = parsePublishedFile(`registry/${kind}/${key}/${name}`);
        if (published) files.push(published);
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
 * @param files result of listPublished()
 * @param supportedRegistries [{ tag, registry }] for each supported release
 */
function planPrune(currentRegistry, files, supportedRegistries) {
  const { entriesOf, parsePublishedFile } = registryLayout();
  const keep = new Map();
  const addReason = (file, reason) => keep.set(file, [...(keep.get(file) || []), reason]);

  for (const { entry } of entriesOf(currentRegistry)) {
    const current = parsePublishedFile(entry.main);
    if (!current) continue;
    addReason(current.file, 'current');

    const older = files
      .filter((f) => f.kind === current.kind && f.key === current.key && compareSemver(f.version, current.version) < 0)
      .sort((a, b) => compareSemver(a.version, b.version));
    if (older.length) addReason(older[older.length - 1].file, 'previous version (rollback)');
  }

  for (const { tag, registry } of supportedRegistries) {
    for (const { entry } of entriesOf(registry || {})) {
      const published = parsePublishedFile(entry.main);
      if (published) addReason(published.file, `referenced by ${tag}`);
    }
  }

  return { keep, deletable: files.filter((f) => !keep.has(f.file)) };
}

module.exports = {
  SUPPORTED_MINOR_LINES,
  compareSemver,
  releaseTags,
  supportedTags,
  registryAt,
  checkReferences,
  checkBase,
  listPublished,
  planPrune,
};
