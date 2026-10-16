#!/usr/bin/env node
/**
 * Signs the extension registry apps download (REG-6): writes an ed25519 signature of the exact
 * bytes of src/extension-registry.json to src/extension-registry.json.sig, one line per key.
 * Apps check it against the public keys in src/registry-signing-keys.ts before using a registry
 * (verifyRegistrySignature / parseSignedRegistry).
 *
 * The private keys come from the REGISTRY_SIGNING_KEY environment variable: one or more
 * 64-character hex ed25519 private keys (as printed by scripts/registry-keygen.js), separated by
 * spaces, commas or newlines. Several keys sign with an old and a new key during a rotation. Each
 * key's public key must be listed in src/registry-signing-keys.ts, so a signature apps can't
 * verify is never written. CI runs this (.github/workflows/sign-registry.yml); the keys are never
 * printed or written to disk.
 *
 * Usage:
 *   REGISTRY_SIGNING_KEY=<private key> node scripts/sign-registry.js
 *       [--registry <file>] [--keys <file>]
 *   --registry  registry to sign (default src/extension-registry.json); writes <file>.sig
 *   --keys      trusted public keys (default src/registry-signing-keys.ts)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  REGISTRY_FILE,
  SIGNING_KEYS_FILE,
  MAX_SIGNATURES,
  ed25519PrivateKey,
  rawPublicKey,
  readSigningKeys,
  verifySignature,
} = require('./registry-support');

const USAGE =
  'usage: REGISTRY_SIGNING_KEY=<private key> node scripts/sign-registry.js [--registry <file>] [--keys <file>]';
const PRIVATE_KEY = /^[0-9a-fA-F]{64}$/;

function fail(message) {
  console.error(`sign-registry: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = { registry: path.join(repoRoot, REGISTRY_FILE), keys: path.join(repoRoot, SIGNING_KEYS_FILE) };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] || fail(`${arg} needs a file\n${USAGE}`);
    if (arg === '--registry') options.registry = path.resolve(value());
    else if (arg === '--keys') options.keys = path.resolve(value());
    else fail(`unknown argument ${arg}\n${USAGE}`);
  }
  return options;
}

/** The private keys in REGISTRY_SIGNING_KEY. Messages never include the variable's value. */
function privateKeys(value) {
  const keys = [...new Set((value || '').split(/[\s,]+/).filter(Boolean))];
  if (!keys.length) fail(`REGISTRY_SIGNING_KEY is not set\n${USAGE}`);
  if (keys.length > MAX_SIGNATURES) fail(`REGISTRY_SIGNING_KEY holds ${keys.length} keys; at most ${MAX_SIGNATURES}`);
  keys.forEach((key, index) => {
    if (!PRIVATE_KEY.test(key)) {
      fail(`REGISTRY_SIGNING_KEY key ${index + 1} is not a 64-character hex ed25519 private key`);
    }
  });
  return keys.map((key) => key.toLowerCase());
}

const options = parseArgs(process.argv.slice(2));
const keys = privateKeys(process.env.REGISTRY_SIGNING_KEY);
const relative = (file) => path.relative(process.cwd(), file) || file;

let trusted;
try {
  trusted = readSigningKeys(options.keys);
} catch (error) {
  fail(error.message);
}
if (!trusted.length) {
  fail(`${relative(options.keys)} lists no public key; run yarn registry:keygen and commit it first`);
}

// The exact bytes apps download, not re-serialized JSON
const registryBytes = fs.readFileSync(options.registry);
const signatures = keys.map((hex, index) => {
  const privateKey = ed25519PrivateKey(hex);
  const publicKey = rawPublicKey(privateKey);
  if (!trusted.includes(publicKey)) {
    fail(
      `REGISTRY_SIGNING_KEY key ${index + 1} (public key ${publicKey}) is not listed in ` +
        `${relative(options.keys)}; list it there (yarn registry:keygen does), or stop signing with that key`
    );
  }
  return { publicKey, signature: crypto.sign(null, registryBytes, privateKey).toString('hex') };
});

if (!signatures.every(({ publicKey, signature }) => verifySignature(registryBytes, signature, [publicKey]))) {
  fail('a new signature does not verify; nothing written');
}
const signatureText = `${signatures.map(({ signature }) => signature).join('\n')}\n`;

const signatureFile = `${options.registry}.sig`;
fs.writeFileSync(signatureFile, signatureText);
const signers = signatures.map(({ publicKey }) => `${publicKey.slice(0, 16)}…`).join(', ');
console.log(`sign-registry: signed ${relative(options.registry)} with ${signers}; wrote ${relative(signatureFile)}`);
