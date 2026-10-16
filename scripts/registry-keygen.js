#!/usr/bin/env node
/**
 * Generates an ed25519 key pair for signing the extension registry (REG-6).
 *
 * Adds the public key to src/registry-signing-keys.ts, keeping the keys already listed, and prints
 * the private key once, with what to do with it. The private key is never written to disk: store
 * it as a GitHub Actions secret, which CI signs with (scripts/sign-registry.js).
 *
 * Usage:
 *   node scripts/registry-keygen.js [--keys <file>]   (yarn registry:keygen)
 *   --keys  the key list to add to (default src/registry-signing-keys.ts)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  SIGNING_KEYS_FILE,
  SIGNING_KEYS_DECLARATION,
  PKCS8_HEADER,
  rawPublicKey,
  parseSigningKeys,
} = require('./registry-support');

const USAGE = 'usage: node scripts/registry-keygen.js [--keys <file>]';
const ENVIRONMENT = 'registry-signing';
const SECRETS = ['REGISTRY_SIGNING_KEY', 'REGISTRY_SIGNING_KEY_2'];

function fail(message) {
  console.error(`registry-keygen: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  let keys = path.join(repoRoot, SIGNING_KEYS_FILE);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--keys') fail(`unknown argument ${argv[i]}\n${USAGE}`);
    keys = path.resolve(argv[++i] || fail(`--keys needs a file\n${USAGE}`));
  }
  return keys;
}

/** `source` with the key list rewritten from `entries` (as parseSigningKeys returns them). */
function renderKeys(source, entries, trailing) {
  const lines = [
    ...entries.flatMap(({ key, comments, note }) => [...comments, `'${key}',${note ? ` ${note}` : ''}`]),
    ...trailing,
  ];
  const list = lines.length ? `[\n${lines.map((line) => `  ${line}`).join('\n')}\n]` : '[]';
  return source.replace(SIGNING_KEYS_DECLARATION, (_match, start) => `${start}${list};`);
}

const keysFile = parseArgs(process.argv.slice(2));
const label = path.relative(process.cwd(), keysFile) || keysFile;
let source;
let current;
try {
  source = fs.readFileSync(keysFile, 'utf8');
  current = parseSigningKeys(source, label);
} catch (error) {
  fail(error.message);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const pkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' });
if (!pkcs8.subarray(0, PKCS8_HEADER.length).equals(PKCS8_HEADER)) fail('unexpected ed25519 private key encoding');
const privateHex = pkcs8.subarray(PKCS8_HEADER.length).toString('hex');
const publicHex = rawPublicKey(publicKey);

const added = { key: publicHex, comments: [`// Added ${new Date().toISOString().slice(0, 10)}`], note: '' };
fs.writeFileSync(keysFile, renderKeys(source, [...current.entries, added], current.trailing));

const rotating = current.entries.length > 0;
const [secret, otherSecret] = rotating ? [SECRETS[1], SECRETS[0]] : SECRETS;
const lines = [
  `Added public key ${publicHex}`,
  `to ${label}${rotating ? `, next to the ${current.entries.length} key(s) already there` : ''}.`,
  '',
  'Private key, shown once and not saved anywhere:',
  '',
  `  ${privateHex}`,
  '',
  `1. Store it as the secret ${secret} in the "${ENVIRONMENT}" environment`,
  `   (Settings > Environments > ${ENVIRONMENT} > Add environment secret), or run`,
  `     gh secret set ${secret} --env ${ENVIRONMENT}`,
  '   and paste it at the prompt. Give the environment a required reviewer and limit it to the',
  '   main branch, so nothing is signed without your approval.',
];
if (rotating) {
  lines.push(
    `   If ${secret} holds the key you are replacing, use ${otherSecret} instead: CI signs with`,
    '   both secrets, so apps that only trust the old key keep verifying the registry.'
  );
}
lines.push(
  `2. Commit ${label} and push it to main. The Sign registry workflow then signs`,
  '   src/extension-registry.json and commits src/extension-registry.json.sig.',
  '3. Release the library: apps only trust the keys bundled in the version they ship.'
);
if (rotating) {
  lines.push(
    '4. Once no supported release needs the old key, remove it from the list, release, and delete its',
    '   secret. Remove a leaked key and its secret at once.'
  );
}
lines.push('', 'Then clear this terminal (scrollback included): the private key is in it.');
console.log(lines.join('\n'));
