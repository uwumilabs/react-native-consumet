import { extensionEnums } from '../models/types';
import type { ExtractorContext, ProviderContext } from '../models';
import { MODELS_MODULE, UTILS_MODULE } from './runtime-modules';
import { assertValidIdentifier, verifyExtensionCode, type IntegrityOptions } from './extension-integrity';
import { createExtensionFetch, fetchTextWithTimeout } from './fetch-with-timeout';

export type ExtensionKind = 'provider' | 'extractor';

/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
export function createExtensionRequire(extensionId: string, modules: Record<string, unknown>) {
  return (specifier: string): any => {
    if (Object.prototype.hasOwnProperty.call(modules, specifier)) return modules[specifier];
    throw new Error(
      `Extension '${extensionId}' requires '${specifier}', which the extension runtime does not provide. ` +
        'Registry code must be a single-file bundle (yarn build).'
    );
  };
}

export type ExtensionFactory = (...args: any[]) => any;

/** The globals extension code runs with; each key becomes a local constant of that name. */
export type ExtensionGlobals = { exports: Record<string, any>; module: { exports: any } } & Record<string, unknown>;

const isProviderContext = (ctx: ExtractorContext | ProviderContext): ctx is ProviderContext => 'enums' in ctx;

/**
 * The globals and `require`-able modules registry code of `kind` runs with, built from the context it
 * gets. Extractor code also sees axios, cheerio's load, CryptoJS and the URL classes as globals;
 * provider code reaches them through `require` or its context.
 */
export function extensionGlobals(
  kind: ExtensionKind,
  id: string,
  ctx: ExtractorContext | ProviderContext
): ExtensionGlobals {
  const parsers = isProviderContext(ctx)
    ? { AnimeParser: ctx.AnimeParser, MovieParser: ctx.MovieParser, MangaParser: ctx.MangaParser }
    : {};
  const utils = isProviderContext(ctx)
    ? { createProviderContext: () => ctx, createExtractorContext: () => ctx }
    : { createExtractorContext: () => ctx };
  // The only modules registry code can require; anything else throws (EXT-5).
  const modules: Record<string, unknown> = {
    'cheerio': { load: ctx.load },
    'axios': ctx.axios,
    'crypto-js': ctx.CryptoJS,
    [MODELS_MODULE]: { ...parsers, ...extensionEnums },
    [UTILS_MODULE]: utils,
  };
  const globals: ExtensionGlobals = {
    exports: {},
    module: { exports: {} },
    require: createExtensionRequire(id, modules),
    console,
    Promise,
    Object,
    fetch: createExtensionFetch(ctx.axios),
  };
  if (kind === 'extractor') {
    Object.assign(globals, {
      axios: ctx.axios,
      load: ctx.load,
      CryptoJS: ctx.CryptoJS,
      URL: ctx.PolyURL,
      URLSearchParams: ctx.PolyURLSearchParams,
    });
  }
  return globals;
}

/**
 * Run single-file extension code and return the function it provides as `name`: `exports[name]`,
 * `module.exports[name]`, a top-level `function name` (code without exports), or its default
 * export. Undefined when it provides none. `name` must be a valid identifier (assertValidIdentifier).
 */
export function evaluateExtensionCode(
  code: string,
  name: string,
  globals: ExtensionGlobals,
  kind: ExtensionKind
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

      ${code}

      return typeof ${name} !== 'undefined' ? ${name} : undefined;
      `
    ) as typeof run;
  } catch (syntaxError: any) {
    throw new Error(`Failed to parse ${kind} code: ${syntaxError.message}`, { cause: syntaxError });
  }

  // The top-level declaration comes first: it always binds its own name, while bundle export
  // getters built without block scoping can point at another export on Hermes (see
  // scripts/hermes-safe-dist.js). Exports cover code without a top-level declaration, and the
  // default export (`export default`) is the last resort.
  let declared: unknown;
  try {
    declared = run(globals);
  } catch (execError: any) {
    throw new Error(`${label} code execution failed: ${execError?.message ?? execError}`, { cause: execError });
  }
  const { exports, module } = globals;
  return [declared, exports[name], module.exports?.[name], exports.default, module.exports?.default].find(
    (candidate): candidate is ExtensionFactory => typeof candidate === 'function'
  );
}

/** Thrown when a registry entry's code can't be downloaded; `status` is the HTTP status, if any. */
export class RegistryFetchError extends Error {
  readonly kind: ExtensionKind;
  readonly url: string;
  readonly status?: number;

  constructor(kind: ExtensionKind, url: string, message: string, status?: number) {
    super(message);
    this.name = 'RegistryFetchError';
    this.kind = kind;
    this.url = url;
    this.status = status;
    Object.setPrototypeOf(this, RegistryFetchError.prototype);
  }
}

/** Download the code a registry entry's `main` points at. */
export async function fetchEntryCode(kind: ExtensionKind, main: string): Promise<string> {
  const what = kind === 'provider' ? 'extension' : 'extractor';
  let response: Awaited<ReturnType<typeof fetchTextWithTimeout>>;
  try {
    response = await fetchTextWithTimeout(main, {
      method: 'GET',
      headers: { 'Accept': 'text/plain, application/javascript, */*', 'User-Agent': 'react-native-consumet' },
    });
  } catch (error) {
    throw new RegistryFetchError(kind, main, `Failed to fetch ${what}: ${(error as Error)?.message ?? error}`);
  }
  if (!response.ok) {
    throw new RegistryFetchError(
      kind,
      main,
      `Failed to fetch ${what}: ${response.status} ${response.statusText}`,
      response.status
    );
  }
  return response.text;
}

/** Compiled extension code, reused only for the same code and sha256 (one entry per key). */
type CompiledCode = { sha256: string; code: string; factory: ExtensionFactory };

export interface CompileRequest {
  kind: ExtensionKind;
  /** Registry id of the entry, for errors */
  id: string;
  /** The function the code must provide; must be a plain identifier, as it's interpolated into the code */
  name: unknown;
  code: string;
  entry: { id?: string; name?: string; sha256?: string };
  globals: () => ExtensionGlobals;
  /** Run the code without checking it against `entry.sha256`; such code is never cached. */
  skipIntegrity?: boolean;
}

/**
 * Turns verified registry code into the function it provides. The same code verified against the
 * same hash runs from its compiled copy; unverified code is checked again on every call.
 */
export class CompiledCodeCache {
  private compiled = new Map<string, CompiledCode>();

  constructor(private integrityOptions: IntegrityOptions = {}) {}

  compile(key: string, request: CompileRequest): ExtensionFactory {
    const { kind, id, name, code, entry, skipIntegrity } = request;
    assertValidIdentifier(name, kind === 'provider' ? 'factoryName' : 'extractor name', id);
    const label = kind === 'provider' ? 'extension' : 'extractor code';

    const sha256 = entry.sha256 ?? '';
    const cached = this.compiled.get(key);
    if (cached?.sha256 === sha256 && cached.code === code) return cached.factory;
    if (!skipIntegrity) verifyExtensionCode(code, entry, this.integrityOptions);

    const factory = evaluateExtensionCode(code, name, request.globals(), kind);
    if (!factory) {
      throw new Error(`Factory function '${name}' not found in ${label}`);
    }
    if (!skipIntegrity) this.compiled.set(key, { sha256, code, factory });
    return factory;
  }

  /** Forget the compiled code of one extension or extractor: keys `${id}` and `${id}|…`. */
  forget(id: string): void {
    deleteEntriesOf(this.compiled, id);
  }
}

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
