/**
 * Where the registry and its files live, and how an entry maps to them. Every registry script
 * reads these from here.
 *
 * The entry rules (kinds, key fields, id and version patterns) come from the library's schema,
 * src/utils/registry-schema.ts, loaded from its build in dist/ (`built`), so the scripts and
 * validateRegistry accept the same entries. Built modules the scripts load have no runtime
 * imports: the Sign registry workflow runs the scripts without installing packages.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const REGISTRY_FILE = 'src/extension-registry.json';
const DIST_REGISTRY_FILE = 'dist/extension-registry.json';
const SIGNATURE_FILE = `${REGISTRY_FILE}.sig`;
const SIGNING_KEYS_FILE = 'src/registry-signing-keys.json';
/** Registry bundles: one self-contained file per distFile, run with `new Function` on Hermes. */
const BUNDLE_DIR = 'dist/bundles';

/**
 * A module of the library built into dist/ by `yarn build`, e.g. `built('utils/registry-schema')`.
 * Throws when it hasn't been built.
 */
function built(name, root = repoRoot) {
  const file = path.join(root, 'dist', `${name}.js`);
  if (!fs.existsSync(file)) throw new Error(`dist/${name}.js not found (run yarn build)`);
  return require(file);
}

/** The raw GitHub URL of package.json's `repository`. */
function rawRepoUrl(root) {
  const { repository } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const url = typeof repository === 'string' ? repository : repository?.url;
  const match = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url || '');
  if (!match) throw new Error(`package.json: repository is not a GitHub repository (${JSON.stringify(repository)})`);
  return `https://raw.githubusercontent.com/${match[1]}`;
}

const readRegistry = (root = repoRoot) => JSON.parse(fs.readFileSync(path.join(root, REGISTRY_FILE), 'utf8'));

/**
 * The entry rules, from the built schema:
 *   kinds                       the registry's lists, `extensions` and `extractors`
 *   entriesOf(registry)         every entry as { kind, entry }
 *   entryKey(kind, entry)       `<kind>/<key>` with the entry's lowercase id or name, or undefined
 *   publishedFile(kind, entry)  `registry/<kind>/<key>/<version>.js`, or undefined when the entry's
 *                               key or version can't form one
 *   parsePublishedFile(text)    { file, kind, key, version } of a path or URL ending in one
 *   publishedUrl(file)          the `main` URL of a published file, on the main branch
 * Throws when the schema hasn't been built.
 */
function registryLayout(root = repoRoot) {
  const { REGISTRY_KINDS, REGISTRY_KEY_PATTERN, REGISTRY_VERSION_PATTERN, registryKey } = built(
    'utils/registry-schema',
    root
  );
  const kinds = Object.keys(REGISTRY_KINDS);
  const KEY = new RegExp(`^${REGISTRY_KEY_PATTERN}$`);
  const VERSION = new RegExp(`^${REGISTRY_VERSION_PATTERN}$`);
  const FILE = new RegExp(
    `(?:^|/)(registry/(${kinds.join('|')})/(${REGISTRY_KEY_PATTERN})/(${REGISTRY_VERSION_PATTERN})\\.js)$`
  );
  let rawRepo;

  return {
    kinds,
    entriesOf: (registry) => kinds.flatMap((kind) => (registry[kind] || []).map((entry) => ({ kind, entry }))),
    entryKey(kind, entry) {
      const key = registryKey(kind, entry);
      return key === undefined ? undefined : `${kind}/${key}`;
    },
    publishedFile(kind, entry) {
      const key = registryKey(kind, entry);
      if (!key || !KEY.test(key) || typeof entry.version !== 'string' || !VERSION.test(entry.version)) {
        return undefined;
      }
      return `registry/${kind}/${key}/${entry.version}.js`;
    },
    parsePublishedFile(text) {
      const match = FILE.exec(typeof text === 'string' ? text : '');
      return match ? { file: match[1], kind: match[2], key: match[3], version: match[4] } : undefined;
    },
    publishedUrl(file) {
      rawRepo ??= rawRepoUrl(root);
      return `${rawRepo}/refs/heads/main/${file}`;
    },
  };
}

/** A repo-relative .js file under BUNDLE_DIR with no empty, `.` or `..` segments. */
function isBundleFile(file) {
  if (typeof file !== 'string' || !file.startsWith(`${BUNDLE_DIR}/`) || !file.endsWith('.js')) return false;
  return file.split('/').every((segment) => /^[A-Za-z0-9_.-]+$/.test(segment) && segment !== '.' && segment !== '..');
}

module.exports = {
  repoRoot,
  REGISTRY_FILE,
  DIST_REGISTRY_FILE,
  SIGNATURE_FILE,
  SIGNING_KEYS_FILE,
  BUNDLE_DIR,
  built,
  readRegistry,
  registryLayout,
  isBundleFile,
};
