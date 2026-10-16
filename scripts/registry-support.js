/**
 * Shared rules for the immutable registry files under registry/.
 *
 * Supported releases: every stable `vX.Y.Z` tag in the two most recent minor lines
 * (e.g. with v1.6.2 as the latest release, all v1.6.* and v1.5.* tags). Their bundled
 * src/extension-registry.json files decide which published versions must stay downloadable.
 *
 * Also the helpers for the registry's signature (REG-6), shared by sign-registry.js,
 * registry-keygen.js and prepare-registry.js --check.
 */
const { Buffer } = require('buffer');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
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

const ZERO_COMMIT = /^0+$/;
const short = (text) => String(text).slice(0, 12);

/** Registry entries keyed by kind and lowercase id/name, the key prepare-registry publishes under. */
function entriesByKey(registry) {
  const keyed = new Map();
  for (const entry of registry.extensions || []) keyed.set(`extensions/${String(entry.id).toLowerCase()}`, entry);
  for (const entry of registry.extractors || []) keyed.set(`extractors/${String(entry.name).toLowerCase()}`, entry);
  return keyed;
}

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
    baseRegistry = JSON.parse(git('show', `${commit}:src/extension-registry.json`));
  } catch {
    notes.push(`base ${short(commit)} has no src/extension-registry.json; skipped the version bump check`);
    return { problems, notes };
  }

  const before = entriesByKey(baseRegistry);
  for (const [key, entry] of entriesByKey(currentRegistry)) {
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

/*
 * Registry signatures (REG-6). CI signs the exact bytes of src/extension-registry.json with ed25519
 * (scripts/sign-registry.js) and commits src/extension-registry.json.sig: one 128-character hex
 * signature per line, one line per signing key. Apps verify it with the public keys listed in
 * src/registry-signing-keys.ts (src/utils/registry-signature.ts, which uses noble-curves; these
 * helpers use Node's crypto, so the scripts need no installed packages).
 */
const REGISTRY_FILE = 'src/extension-registry.json';
const SIGNATURE_FILE = `${REGISTRY_FILE}.sig`;
const SIGNING_KEYS_FILE = 'src/registry-signing-keys.ts';
// MAX_REGISTRY_SIGNATURES in src/utils/registry-signature.ts
const MAX_SIGNATURES = 4;
const SIGNING_KEYS_DECLARATION = /(export const REGISTRY_SIGNING_KEYS: readonly string\[\] = )\[([^\]]*)\];/;
const PUBLIC_KEY = /^[0-9a-f]{64}$/;
const SIGNATURE = /^[0-9a-f]{128}$/i;
// DER headers that wrap a raw 32-byte ed25519 key for Node's crypto
const SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');
const PKCS8_HEADER = Buffer.from('302e020100300506032b657004220420', 'hex');

const ed25519PublicKey = (hex) =>
  crypto.createPublicKey({ key: Buffer.concat([SPKI_HEADER, Buffer.from(hex, 'hex')]), format: 'der', type: 'spki' });
const ed25519PrivateKey = (hex) =>
  crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_HEADER, Buffer.from(hex, 'hex')]),
    format: 'der',
    type: 'pkcs8',
  });
/** The raw hex public key of an ed25519 KeyObject (public, or private to derive it from). */
const rawPublicKey = (keyObject) =>
  (keyObject.type === 'private' ? crypto.createPublicKey(keyObject) : keyObject)
    .export({ format: 'der', type: 'spki' })
    .subarray(SPKI_HEADER.length)
    .toString('hex');

/**
 * The keys in src/registry-signing-keys.ts, each with the comment lines above it, plus comment
 * lines after the last key. Throws, naming `label`, when the list can't be read: keys must be
 * quoted 64-character lowercase hex strings, separated by commas, with only `//` comments.
 */
function parseSigningKeys(source, label = SIGNING_KEYS_FILE) {
  const declaration = SIGNING_KEYS_DECLARATION.exec(source);
  if (!declaration) throw new Error(`${label}: no "export const REGISTRY_SIGNING_KEYS: readonly string[] = [...];"`);

  const entries = [];
  let comments = [];
  for (const raw of declaration[2].split('\n')) {
    const commentAt = raw.indexOf('//');
    const code = (commentAt < 0 ? raw : raw.slice(0, commentAt)).trim();
    const comment = commentAt < 0 ? '' : raw.slice(commentAt).trim();
    if (!code) {
      if (comment) comments.push(comment);
      continue;
    }
    for (const token of code.split(',').map((part) => part.trim())) {
      if (!token) continue;
      const literal = /^(['"])([^'"]*)\1$/.exec(token);
      if (!literal) {
        throw new Error(`${label}: can't read ${token} in REGISTRY_SIGNING_KEYS; list keys as quoted strings`);
      }
      if (!PUBLIC_KEY.test(literal[2])) {
        throw new Error(`${label}: signing key '${literal[2]}' is not a 64-character lowercase hex ed25519 public key`);
      }
      entries.push({ key: literal[2], comments, note: comment });
      comments = [];
    }
  }
  return { entries, trailing: comments };
}

/** The hex public keys listed in `file` (src/registry-signing-keys.ts). Throws if it can't be read. */
function readSigningKeys(file = path.join(repoRoot, SIGNING_KEYS_FILE)) {
  const label = path.relative(process.cwd(), file) || file;
  return parseSigningKeys(fs.readFileSync(file, 'utf8'), label).entries.map((entry) => entry.key);
}

/** The signatures in a signature file's text. Throws when it isn't 1 to MAX_SIGNATURES hex lines. */
function parseSignatures(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length || lines.length > MAX_SIGNATURES) {
    throw new Error(`must hold 1 to ${MAX_SIGNATURES} signatures, one per line (got ${lines.length})`);
  }
  return lines.map((line, index) => {
    if (!SIGNATURE.test(line)) throw new Error(`line ${index + 1} is not a 128-character hex ed25519 signature`);
    return Buffer.from(line, 'hex');
  });
}

/**
 * The public key (of `publicKeys`) that one of the signatures in `signatureText` verifies
 * `registryBytes` under, or undefined if none does. Throws if the signature text is malformed.
 */
function verifySignature(registryBytes, signatureText, publicKeys) {
  const signatures = parseSignatures(signatureText);
  const keys = publicKeys.map((key) => ({ key, object: ed25519PublicKey(key) }));
  for (const signature of signatures) {
    const match = keys.find(({ object }) => crypto.verify(null, registryBytes, object, signature));
    if (match) return match.key;
  }
  return undefined;
}

/**
 * Whether src/extension-registry.json.sig is valid for the registry under the keys bundled in
 * src/registry-signing-keys.ts. CI can only sign once a change reaches main, so a missing or stale
 * signature is a note; an unreadable key list is a problem.
 */
function checkSignature(root = repoRoot) {
  const problems = [];
  const notes = [];
  const keysPath = path.join(root, SIGNING_KEYS_FILE);
  if (!fs.existsSync(keysPath)) {
    notes.push(`${SIGNING_KEYS_FILE} not found; skipped the registry signature check`);
    return { problems, notes };
  }

  let keys;
  try {
    keys = parseSigningKeys(fs.readFileSync(keysPath, 'utf8')).entries.map((entry) => entry.key);
  } catch (error) {
    problems.push(error.message);
    return { problems, notes };
  }
  if (!keys.length) {
    notes.push(
      `no registry signing key in ${SIGNING_KEYS_FILE} yet, so apps can't verify a downloaded registry ` +
        '(run yarn registry:keygen)'
    );
    return { problems, notes };
  }

  const resign = 'the Sign registry workflow re-signs the registry once it reaches main';
  const signaturePath = path.join(root, SIGNATURE_FILE);
  if (!fs.existsSync(signaturePath)) {
    notes.push(`${SIGNATURE_FILE} is missing; ${resign}`);
    return { problems, notes };
  }
  try {
    const registryBytes = fs.readFileSync(path.join(root, REGISTRY_FILE));
    const key = verifySignature(registryBytes, fs.readFileSync(signaturePath, 'utf8'), keys);
    notes.push(
      key
        ? `${SIGNATURE_FILE} is valid (signed with key ${key.slice(0, 16)}…)`
        : `${SIGNATURE_FILE} doesn't match the registry or a bundled key (stale); ${resign}`
    );
  } catch (error) {
    notes.push(`${SIGNATURE_FILE} ${error.message}; ${resign}`);
  }
  return { problems, notes };
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
  checkBase,
  publishedFiles,
  planPrune,
  REGISTRY_FILE,
  SIGNATURE_FILE,
  SIGNING_KEYS_FILE,
  MAX_SIGNATURES,
  SIGNING_KEYS_DECLARATION,
  PKCS8_HEADER,
  ed25519PrivateKey,
  rawPublicKey,
  parseSigningKeys,
  readSigningKeys,
  parseSignatures,
  verifySignature,
  checkSignature,
};
