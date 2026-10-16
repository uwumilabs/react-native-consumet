/**
 * How the Registry tab loads provider code. There are two modes:
 *
 * - `registry` (default) is the path apps use. ProviderManager fetches the entry's `main` URL (an
 *   immutable file under `registry/` on GitHub main). It checks the code against the entry's
 *   `sha256` and refuses entries this library can't run. Extractors go through the manager's
 *   shared ExtractorManager.
 * - `local` runs the code in `local-dist-map.ts`, for working on a provider before it is
 *   published. The code is still checked against the entry's `sha256`, so a stale local bundle is
 *   reported as an integrity mismatch. The user can then run it without the check, and the UI
 *   labels that load as unverified.
 */

import {
  ExtensionRegistry,
  IntegrityError,
  ProviderManager,
  RegistryError,
  type ExtensionManifest,
  type IAnimeProvider,
  type IMovieProvider,
} from 'react-native-consumet';
import LOCAL_DIST_MAP from './local-dist-map';

export type LoadMode = 'registry' | 'local';

export const DEFAULT_LOAD_MODE: LoadMode = 'registry';

export const LOAD_MODES: { id: LoadMode; label: string; description: string }[] = [
  {
    id: 'registry',
    label: 'Registry',
    description: "Fetches each entry's main URL from GitHub main and verifies its sha256",
  },
  {
    id: 'local',
    label: 'Local dist',
    description: 'Runs local-dist-map.ts, checked against the registry sha256',
  },
];

const LOCAL_SOURCE = 'apps/src/registry/local-dist-map.ts';

export type LoadedProvider = IAnimeProvider | IMovieProvider;

/** What was loaded, from where, and whether it was verified. Shown under the screen header. */
export interface LoadReport {
  mode: LoadMode;
  id: string;
  name: string;
  version: string;
  /** Where the code came from: the entry's `main` URL, or the local dist map */
  source: string;
  /** Whether the code was checked against the entry's `sha256` before it ran */
  integrity: 'verified' | 'skipped';
  sha256?: string;
}

export interface LoadOptions {
  /** Local mode only: run the local bundle without checking it against the entry's `sha256` */
  skipIntegrity?: boolean;
}

/** The local dist map has no code for this id (run `yarn example gen:local-dist`). */
export class LocalBundleMissingError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`No local dist bundle for '${id}' in ${LOCAL_SOURCE}`);
    this.name = 'LocalBundleMissingError';
    this.id = id;
    Object.setPrototypeOf(this, LocalBundleMissingError.prototype);
  }
}

/**
 * One manager for the whole Registry tab, so both sub-tabs share its ExtractorManager, as they
 * would in an app. The constructor validates the registry and can throw a RegistryError.
 */
export function createProviderManager(): { manager: ProviderManager } | { failure: LoadFailure } {
  try {
    return { manager: new ProviderManager(ExtensionRegistry) };
  } catch (error) {
    return { failure: describeLoadError(error) };
  }
}

/**
 * Load a provider in the given mode.
 *
 * @throws IntegrityError when the code doesn't match the entry's `sha256`
 * @throws RegistryError when the entry needs a newer extension context (`updateRequired`)
 * @throws Error `Failed to fetch extension: <status>` when `main` can't be downloaded (registry mode)
 * @throws LocalBundleMissingError when the local dist map has no code for the entry (local mode)
 */
export async function loadProvider(
  manager: ProviderManager,
  ext: ExtensionManifest,
  mode: LoadMode,
  options: LoadOptions = {}
): Promise<{ provider: LoadedProvider; report: LoadReport }> {
  const metadata = manager.getExtensionMetadata(ext.id);
  const base = { mode, id: metadata.id, name: metadata.name, version: metadata.version, sha256: metadata.sha256 };

  if (mode === 'registry') {
    // The calls an app makes: fetch `main`, verify it, then run it. The hash check can't be skipped here.
    let provider: LoadedProvider;
    if (metadata.category === 'anime') provider = await manager.getAnimeProvider(metadata.id);
    else if (metadata.category === 'movies') provider = await manager.getMovieProvider(metadata.id);
    else throw new Error(`'${metadata.id}' is a ${metadata.category} extension; this screen loads anime and movies`);
    return { provider, report: { ...base, source: metadata.main, integrity: 'verified' } };
  }

  const code = LOCAL_DIST_MAP[metadata.id];
  if (!code) throw new LocalBundleMissingError(metadata.id);
  const skipIntegrity = options.skipIntegrity === true;
  const provider = await manager.executeProviderCode(code, metadata.factoryName, metadata, { skipIntegrity });
  return {
    provider,
    report: { ...base, source: LOCAL_SOURCE, integrity: skipIntegrity ? 'skipped' : 'verified' },
  };
}

/** Text shown while a provider loads. */
export function loadingMessage(mode: LoadMode, ext?: ExtensionManifest | null): string {
  if (mode === 'local') return 'Running the local dist bundle…';
  return `Fetching ${ext?.version ? `v${ext.version} ` : ''}from GitHub main and verifying its sha256…`;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export type LoadFailureKind =
  | 'integrity'
  | 'update-required'
  | 'invalid-registry'
  | 'not-published'
  | 'network'
  | 'local-missing'
  | 'other';

/** A load error, described for the screen. */
export interface LoadFailure {
  kind: LoadFailureKind;
  title: string;
  /** The error's own message */
  message: string;
  /** What it means and what to do about it */
  hint?: string;
  /** Extra facts: hashes, URL, registry issues */
  details: string[];
  /** Local mode: the bundle can be run without the hash check (the UI labels it unverified) */
  canSkipIntegrity: boolean;
  /** A mode that may work instead */
  suggestMode?: LoadMode;
}

// `instanceof` is the real check; the name covers a second copy of the library in the bundle.
const isError = (error: unknown, ctor: new (...args: any[]) => Error, name: string): boolean =>
  error instanceof ctor || (error instanceof Error && error.name === name);

const FETCH_STATUS_RE = /Failed to fetch (?:extension|extractor): (\d{3})/;
const NETWORK_RE = /Network request failed|Timed out after \d+ms|fetch failed|aborted/i;

/**
 * Describe an error from `loadProvider` (or `createProviderManager`) for the screen: integrity
 * errors, registry errors (with `updateRequired`), versions not yet on main (404), network errors,
 * and a missing local bundle.
 */
export function describeLoadError(error: unknown, ext?: ExtensionManifest | null, mode?: LoadMode): LoadFailure {
  const message = error instanceof Error ? error.message : String(error);
  const label = ext ? `${ext.name} ${ext.version}` : 'This entry';
  const base = { message, details: [] as string[], canSkipIntegrity: false };

  if (isError(error, IntegrityError, 'IntegrityError')) {
    const { code, expected, actual } = error as IntegrityError;
    const hashes = [expected && `expected ${expected}`, actual && `actual   ${actual}`].filter(
      (line): line is string => !!line
    );

    if (code === 'INVALID_IDENTIFIER') {
      return { ...base, kind: 'invalid-registry', title: 'Invalid registry entry' };
    }
    if (code === 'INTEGRITY_MISSING') {
      return {
        ...base,
        kind: 'integrity',
        title: 'No integrity hash',
        hint: `${label} has no sha256 in the registry, so its code is refused. Run node scripts/prepare-registry.js.`,
        canSkipIntegrity: mode === 'local',
      };
    }
    if (mode === 'local') {
      return {
        ...base,
        kind: 'integrity',
        title: "Local bundle doesn't match the registry",
        hint:
          `The code in local-dist-map.ts isn't the code registered for ${label}. ` +
          'Rebuild (yarn build), publish the entry (node scripts/prepare-registry.js), then regenerate ' +
          'the map (yarn example gen:local-dist). While developing, you can run it unverified.',
        details: hashes,
        canSkipIntegrity: true,
      };
    }
    return {
      ...base,
      kind: 'integrity',
      title: 'Integrity check failed',
      hint:
        `The file served at ${label}'s main URL doesn't match the registry sha256, so it was not run. ` +
        'A published version must never change: publish a new version instead of overwriting a file.',
      details: ext ? [...hashes, ext.main] : hashes,
    };
  }

  if (isError(error, RegistryError, 'RegistryError')) {
    const { updateRequired, required, supported, issues } = error as RegistryError;
    if (updateRequired) {
      return {
        ...base,
        kind: 'update-required',
        title: 'App update required',
        hint:
          `${ext ? label : 'The registry'} needs a newer react-native-consumet than this app has. ` +
          'Update the library in the app to load it.',
        details: required !== undefined ? [`needs version ${required}, this app supports ${supported}`] : [],
      };
    }
    return { ...base, kind: 'invalid-registry', title: 'Invalid registry', details: issues };
  }

  if (error instanceof LocalBundleMissingError) {
    return {
      ...base,
      kind: 'local-missing',
      title: 'No local bundle',
      hint: 'Build the provider (yarn build), then regenerate the map (yarn example gen:local-dist).',
      suggestMode: 'registry',
    };
  }

  const status = FETCH_STATUS_RE.exec(message)?.[1];
  if (status === '404') {
    return {
      ...base,
      kind: 'not-published',
      title: 'Not published on main yet',
      hint:
        `${label} is fetched from the registry/ folder of GitHub's main branch. A version committed ` +
        'but not pushed to main (or one pruned from it) returns 404. Push it to main, or switch to ' +
        'Local dist to try unpublished code.',
      details: ext ? [ext.main] : [],
      suggestMode: 'local',
    };
  }
  if (status) {
    return {
      ...base,
      kind: 'network',
      title: `Registry download failed (HTTP ${status})`,
      hint: "GitHub didn't serve the file. Retry in a moment.",
      details: ext ? [ext.main] : [],
    };
  }
  if (error instanceof TypeError || NETWORK_RE.test(message)) {
    return {
      ...base,
      kind: 'network',
      title: 'Network error',
      hint: "Couldn't reach raw.githubusercontent.com. Check the device's connection, then retry.",
      details: ext && mode === 'registry' ? [ext.main] : [],
      suggestMode: mode === 'registry' ? 'local' : undefined,
    };
  }

  return { ...base, kind: 'other', title: `Failed to load ${ext?.name ?? 'the provider'}` };
}
