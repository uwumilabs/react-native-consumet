/**
 * Registry signatures (REG-6), for sign-registry.js, registry-keygen.js and prepare-registry.js --check.
 *
 * CI signs the exact bytes of src/extension-registry.json with ed25519 (sign-registry.js) and
 * commits src/extension-registry.json.sig, one signature per line and key. Apps verify it with the
 * public keys in src/registry-signing-keys.json (src/utils/registry-signature.ts, with
 * noble-curves). These helpers use Node's crypto, and read the signature and key format from
 * the build of src/utils/registry-signature-format.ts, so they need no installed packages.
 */
const { Buffer } = require('buffer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { repoRoot, REGISTRY_FILE, SIGNATURE_FILE, SIGNING_KEYS_FILE, built } = require('./registry-paths');

/** The GitHub environment holding the signing secrets, and the secrets (one private key each). */
const SIGNING_ENVIRONMENT = 'registry-signing';
const SIGNING_SECRETS = ['REGISTRY_SIGNING_KEY', 'REGISTRY_SIGNING_KEY_2'];

const signatureFormat = (root = repoRoot) => built('utils/registry-signature-format', root);

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
 * The entries of a key list file (src/registry-signing-keys.json): a JSON array of
 * `{ "publicKey": "<64 hex characters>", "added": "<date>" }`. Throws, naming `label`, when the
 * file can't be read as one.
 */
function parseSigningKeys(text, label = SIGNING_KEYS_FILE) {
  let entries;
  try {
    entries = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: not valid JSON (${error.message})`);
  }
  if (!Array.isArray(entries)) throw new Error(`${label}: must be a JSON array of { "publicKey": ..., "added": ... }`);
  const { publicKeyHex } = signatureFormat();
  for (const [index, entry] of entries.entries()) {
    const key = entry && typeof entry === 'object' ? entry.publicKey : undefined;
    if (!publicKeyHex(key)) {
      throw new Error(
        `${label}: signing key ${index + 1} (${JSON.stringify(key)}) is not a 64-character hex ed25519 public key`
      );
    }
  }
  return entries;
}

/** The public keys, as lowercase hex, listed in a key list file. Throws if it can't be read. */
function readSigningKeys(file = path.join(repoRoot, SIGNING_KEYS_FILE)) {
  const label = path.relative(process.cwd(), file) || file;
  const { publicKeyHex } = signatureFormat();
  return parseSigningKeys(fs.readFileSync(file, 'utf8'), label).map((entry) => publicKeyHex(entry.publicKey));
}

/** A key list file's text for `entries`, as Prettier formats JSON. */
const renderSigningKeys = (entries) => `${JSON.stringify(entries, null, 2)}\n`;

/**
 * The public key (of `publicKeys`) that one of the signatures in `signatureText` verifies
 * `registryBytes` under, or undefined if none does. Throws if the signature text is malformed.
 */
function verifySignature(registryBytes, signatureText, publicKeys) {
  const signatures = signatureFormat().parseSignatureLines(signatureText);
  const keys = publicKeys.map((key) => ({ key, object: ed25519PublicKey(key) }));
  for (const signature of signatures) {
    const match = keys.find(({ object }) => crypto.verify(null, registryBytes, object, Buffer.from(signature, 'hex')));
    if (match) return match.key;
  }
  return undefined;
}

/**
 * Whether src/extension-registry.json.sig is valid for the registry under the keys bundled in
 * src/registry-signing-keys.json. CI can only sign once a change reaches main, so a missing or
 * stale signature is a note; an unreadable key list is a problem.
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
    keys = readSigningKeys(keysPath);
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
  SIGNING_ENVIRONMENT,
  SIGNING_SECRETS,
  PKCS8_HEADER,
  signatureFormat,
  ed25519PrivateKey,
  rawPublicKey,
  parseSigningKeys,
  readSigningKeys,
  renderSigningKeys,
  verifySignature,
  checkSignature,
};
