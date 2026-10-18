import {
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
} from '../models/types';

/** Module names registry bundles import from the runtime (see scripts/build-extensions.js). */
export const MODELS_MODULE = 'react-native-consumet/models';
export const UTILS_MODULE = 'react-native-consumet/utils';

// Paths tsc-built extensions used for the same modules, at any depth (`../models`, `../../../models/index.js`).
const LEGACY_MODELS = /^(\.\.\/)+models(\/index)?(\.js)?$/;
const LEGACY_UTILS = /^(\.\.\/)+utils(\/index|\/create-provider-context|\/create-extractor-context)?(\.js)?$/;

/** The library's enums, handed to extensions as-is so their values always match. */
export const extensionEnums = {
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
};

/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
export function createExtensionRequire(extensionId: string, modules: Record<string, unknown>) {
  return (specifier: string): any => {
    const key = LEGACY_MODELS.test(specifier) ? MODELS_MODULE : LEGACY_UTILS.test(specifier) ? UTILS_MODULE : specifier;
    if (Object.prototype.hasOwnProperty.call(modules, key)) return modules[key];
    throw new Error(
      `Extension '${extensionId}' requires '${specifier}', which the extension runtime does not provide. ` +
        'Registry code must be a single-file bundle (yarn build).'
    );
  };
}

export type ExtensionFactory = (...args: any[]) => any;

/** The globals extension code runs with; each key becomes a local constant of that name. */
export type ExtensionGlobals = { exports: Record<string, any>; module: { exports: any } } & Record<string, unknown>;

/**
 * Run single-file extension code and return the function it provides as `name`: `exports[name]`,
 * `module.exports[name]`, a top-level `function name` (code without exports), or its default
 * export. Undefined when it provides none. `name` must be a valid identifier (assertValidIdentifier).
 */
export function evaluateExtensionCode(
  code: string,
  name: string,
  globals: ExtensionGlobals,
  kind: 'provider' | 'extractor'
): ExtensionFactory | undefined {
  const label = kind === 'provider' ? 'Provider' : 'Extractor';
  let run: (context: ExtensionGlobals) => unknown;
  try {
    run = new Function(
      'context',
      `
      ${Object.keys(globals)
        .map((key) => `const ${key} = context.${key};`)
        .join('\n      ')}

      try {
        ${code}
      } catch (execError) {
        console.error('Error during ${kind} code execution:', execError);
        throw new Error('${label} code execution failed: ' + execError.message);
      }

      return typeof ${name} !== 'undefined' ? ${name} : undefined;
      `
    ) as typeof run;
  } catch (syntaxError: any) {
    console.error(`Syntax error in ${kind} code:`, syntaxError);
    throw new Error(`Failed to parse ${kind} code: ${syntaxError.message}`);
  }

  // The top-level declaration comes first: it always binds its own name, while bundle export
  // getters built without block scoping can point at another export on Hermes (see
  // scripts/hermes-safe-dist.js). Exports cover code without a top-level declaration, and the
  // default export (`export default`) is the last resort.
  const declared = run(globals);
  const { exports, module } = globals;
  return [declared, exports[name], module.exports?.[name], exports.default, module.exports?.default].find(
    (candidate): candidate is ExtensionFactory => typeof candidate === 'function'
  );
}

/** Compiled extension code, reused only for the same code and sha256 (one entry per key). */
export type CompiledCode = { sha256: string; code: string; factory: ExtensionFactory };

/**
 * Share one load per key: concurrent callers get the same promise, later callers the result.
 * A failed load is forgotten, so the next call tries again.
 */
export function memoiseLoad<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = load();
  cache.set(key, pending);
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}

/** Delete the entries of one extension or extractor: keys `${id}` and `${id}|…`. */
export function deleteEntriesOf(cache: Map<string, unknown>, id: string): void {
  for (const key of Array.from(cache.keys())) {
    if (key === id || key.startsWith(`${id}|`)) cache.delete(key);
  }
}
