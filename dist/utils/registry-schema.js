"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RegistryError = exports.REGISTRY_SCHEMA_VERSION = exports.CONTEXT_VERSION = void 0;
exports.isCompatibleEntry = isCompatibleEntry;
exports.assertCompatibleEntry = assertCompatibleEntry;
exports.validateRegistry = validateRegistry;
// No runtime imports: scripts/prepare-registry.js can require the built file on its own.
/**
 * Version of the context this library gives extension code: the `ctx` helpers, the modules it can
 * `require` and the globals it runs with. Bump it when extension code may need something earlier
 * versions don't provide, and have the entries that need it declare `minContextVersion`.
 */
exports.CONTEXT_VERSION = 1;
/**
 * Newest registry `schemaVersion` this library reads. Bump it only for changes older libraries
 * would misread (a field removed, renamed or changing meaning); new optional fields don't need it.
 */
exports.REGISTRY_SCHEMA_VERSION = 1;
/** Registries without `schemaVersion` and entries without `minContextVersion` predate them: version 1. */
const DEFAULT_VERSION = 1;
/**
 * Thrown when a registry is malformed, uses a newer schema than this library reads, or an entry
 * needs a newer extension context. `updateRequired` marks the cases a newer app version fixes.
 */
class RegistryError extends Error {
  code;
  /** Extension id or extractor name, when the error is about one entry */
  id;
  /** Every problem found, e.g. `extensions[2] (anineko): factoryName must be a JavaScript identifier` */
  issues;
  /** Version the registry or entry needs: its `schemaVersion` or `minContextVersion` */
  required;
  /** Version this library supports: REGISTRY_SCHEMA_VERSION or CONTEXT_VERSION */
  supported;
  /** True when a newer version of the app would accept it, so the user should update */
  updateRequired;
  constructor(code, message) {
    let details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    this.id = details.id;
    this.issues = details.issues ?? [message];
    this.required = details.required;
    this.supported = details.supported;
    this.updateRequired = code !== 'INVALID_REGISTRY';
    // Keep `instanceof RegistryError` working when compiled to ES5-style classes.
    Object.setPrototypeOf(this, RegistryError.prototype);
  }
}
exports.RegistryError = RegistryError;
// Factory and extractor names are interpolated into generated code (same rule as assertValidIdentifier).
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
// Ids end up in cache keys and file paths, in this library and in apps.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
// Keyed by ProviderType, so adding a category to the type doesn't compile until it is listed here.
const CATEGORIES = Object.keys({
  'anime': true,
  'movies': true,
  'manga': true,
  'light-novels': true,
  'meta': true
});
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isPositiveInteger = value => Number.isInteger(value) && value >= 1;
const rule = (expected, check) => ({
  required: {
    required: true,
    check,
    expected
  },
  optional: {
    required: false,
    check,
    expected
  }
});
const text = rule('a string', v => typeof v === 'string');
const nonEmpty = rule('a non-empty string', v => typeof v === 'string' && v.length > 0);
const flag = rule('a boolean', v => typeof v === 'boolean');
const strings = rule('an array of strings', v => Array.isArray(v) && v.every(s => typeof s === 'string'));
const identifier = rule('a JavaScript identifier', v => typeof v === 'string' && IDENTIFIER_RE.test(v));
const id = rule('letters, digits, "-" or "_"', v => typeof v === 'string' && ID_RE.test(v));
const version = rule('a semver version like 1.2.3', v => typeof v === 'string' && VERSION_RE.test(v));
const sha256 = rule('a lowercase hex SHA-256 digest', v => typeof v === 'string' && SHA256_RE.test(v));
const contextVersion = rule('a positive integer', isPositiveInteger);
const category = rule(`one of ${CATEGORIES.join(', ')}`, v => typeof v === 'string' && CATEGORIES.includes(v));
const author = rule('an object with a string name', v => isObject(v) && typeof v.name === 'string');
// The fields ExtensionManifest / ExtractorInfo declare. Display fields are only type-checked, so
// new values (e.g. a new `status`) don't invalidate a registry. Unknown fields are ignored.
const EXTENSION_RULES = {
  id: id.required,
  name: nonEmpty.required,
  description: text.required,
  version: version.required,
  minContextVersion: contextVersion.optional,
  author: author.required,
  category: category.required,
  main: nonEmpty.required,
  factoryName: identifier.required,
  sha256: sha256.optional,
  distFile: text.optional,
  baseUrl: text.required,
  logo: text.required,
  languages: strings.optional,
  nsfw: flag.optional,
  status: text.required,
  lastUpdated: text.required,
  extractors: strings.required,
  subbed: flag.optional,
  dubbed: flag.optional,
  isSourceEmbed: flag.optional,
  isSourceDirect: flag.optional,
  haveMultiServers: flag.optional
};
const EXTRACTOR_RULES = {
  name: identifier.required,
  aliases: strings.optional,
  version: version.required,
  minContextVersion: contextVersion.optional,
  main: nonEmpty.required,
  sha256: sha256.optional,
  distFile: text.optional
};
// An entry this library can't run is only checked for what's needed to find and refuse it (server
// names resolve through extractor aliases): it may use fields or values added after this version.
const INCOMPATIBLE_EXTENSION_RULES = {
  id: id.required
};
const INCOMPATIBLE_EXTRACTOR_RULES = {
  name: nonEmpty.required,
  aliases: strings.optional
};
const received = value => {
  if (value === undefined) return 'missing';
  const json = JSON.stringify(value) ?? String(value);
  return `got ${json.length > 40 ? `${json.slice(0, 40)}…` : json}`;
};
/** Context version an entry needs: its `minContextVersion`, or 1 when it has none. */
const neededContextVersion = entry => entry?.minContextVersion === undefined ? DEFAULT_VERSION : entry.minContextVersion;
/**
 * Whether this library can run an entry: it needs no newer context than CONTEXT_VERSION.
 * Entries without `minContextVersion` need context 1. A malformed value is never compatible.
 */
function isCompatibleEntry(entry) {
  const needed = neededContextVersion(entry);
  return isPositiveInteger(needed) && needed <= exports.CONTEXT_VERSION;
}
/**
 * Refuse an extension or extractor entry this library can't run. The managers call this before
 * fetching or executing code, including `execute*Code` with code the app cached itself.
 *
 * @throws RegistryError `INCOMPATIBLE_ENTRY` (with `updateRequired`) when the entry needs a newer
 *   context, or `INVALID_REGISTRY` when its `minContextVersion` isn't a positive integer
 */
function assertCompatibleEntry(entry) {
  const label = entry?.id !== undefined ? 'Extension' : 'Extractor';
  const entryId = String(entry?.id ?? entry?.name);
  const needed = neededContextVersion(entry);
  if (!isPositiveInteger(needed)) {
    const issue = `${label} '${entryId}': minContextVersion must be a positive integer (${received(needed)})`;
    throw new RegistryError('INVALID_REGISTRY', issue, {
      id: entryId
    });
  }
  if (needed > exports.CONTEXT_VERSION) {
    throw new RegistryError('INCOMPATIBLE_ENTRY', `${label} '${entryId}' needs extension context ${needed}, but this app has ${exports.CONTEXT_VERSION}. ` + 'Update the app to use it.', {
      id: entryId,
      required: needed,
      supported: exports.CONTEXT_VERSION
    });
  }
}
function checkEntries(issues, list, field, rules, incompatibleRules) {
  if (!Array.isArray(list)) {
    issues.push(`${field}: must be an array (${received(list)})`);
    return;
  }
  const keyField = field === 'extensions' ? 'id' : 'name';
  const seen = new Set();
  list.forEach((entry, index) => {
    if (!isObject(entry)) {
      issues.push(`${field}[${index}]: must be an object (${received(entry)})`);
      return;
    }
    const key = entry[keyField];
    const where = typeof key === 'string' ? `${field}[${index}] (${key})` : `${field}[${index}]`;
    const needed = entry.minContextVersion;
    const applied = isPositiveInteger(needed) && needed > exports.CONTEXT_VERSION ? incompatibleRules : rules;
    for (const [name, {
      required,
      check,
      expected
    }] of Object.entries(applied)) {
      const value = entry[name];
      if (value === undefined ? required : !check(value)) {
        issues.push(`${where}: ${name} must be ${expected} (${received(value)})`);
      }
    }
    // Lookups are case-insensitive, so a second entry with the same key would shadow the first.
    if (typeof key === 'string') {
      if (seen.has(key.toLowerCase())) issues.push(`${where}: duplicate ${keyField} '${key}'`);
      seen.add(key.toLowerCase());
    }
  });
}
/**
 * Check a registry (bundled, or downloaded as JSON) before the managers use it.
 * A missing `schemaVersion` reads as 1; fields not in the schema are ignored.
 *
 * @throws RegistryError `UNSUPPORTED_SCHEMA` (with `updateRequired`) when `schemaVersion` is newer
 *   than REGISTRY_SCHEMA_VERSION, or `INVALID_REGISTRY` listing every problem in `issues`
 */
function validateRegistry(registry) {
  if (!isObject(registry)) {
    const issue = `registry: must be an object with extensions and extractors (${received(registry)})`;
    throw new RegistryError('INVALID_REGISTRY', `Invalid extension registry: ${issue}`, {
      issues: [issue]
    });
  }
  const schemaVersion = registry.schemaVersion === undefined ? DEFAULT_VERSION : registry.schemaVersion;
  if (!isPositiveInteger(schemaVersion)) {
    const issue = `schemaVersion: must be a positive integer (${received(schemaVersion)})`;
    throw new RegistryError('INVALID_REGISTRY', `Invalid extension registry: ${issue}`, {
      issues: [issue]
    });
  }
  // Checked first: a newer schema may lay entries out in ways this version can't check.
  if (schemaVersion > exports.REGISTRY_SCHEMA_VERSION) {
    throw new RegistryError('UNSUPPORTED_SCHEMA', `Extension registry schemaVersion ${schemaVersion} is newer than this app reads ` + `(${exports.REGISTRY_SCHEMA_VERSION}). Update the app to use this registry.`, {
      required: schemaVersion,
      supported: exports.REGISTRY_SCHEMA_VERSION
    });
  }
  const issues = [];
  checkEntries(issues, registry.extensions, 'extensions', EXTENSION_RULES, INCOMPATIBLE_EXTENSION_RULES);
  checkEntries(issues, registry.extractors, 'extractors', EXTRACTOR_RULES, INCOMPATIBLE_EXTRACTOR_RULES);
  if (issues.length) {
    const count = issues.length === 1 ? '1 problem' : `${issues.length} problems`;
    throw new RegistryError('INVALID_REGISTRY', `Invalid extension registry (${count}): ${issues.join('; ')}`, {
      issues
    });
  }
  return {
    schemaVersion,
    extensions: registry.extensions,
    extractors: registry.extractors
  };
}
//# sourceMappingURL=registry-schema.js.map