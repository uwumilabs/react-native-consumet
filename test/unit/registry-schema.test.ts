import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import {
  CONTEXT_VERSION,
  REGISTRY_SCHEMA_VERSION,
  RegistryError,
  isCompatibleEntry,
  validateRegistry,
} from '../../src/utils/registry-schema';
import { rejectionOf, thrownBy } from './helpers/errors';
import {
  countRuns,
  extensionEntry,
  extractorCode,
  extractorEntry,
  providerCode,
  registryOf as registryWith,
  resetRuns,
  runsOf,
  serveFiles,
  type FetchSpy,
} from './helpers/registry';

const NEWER_CONTEXT = CONTEXT_VERSION + 1;

// Each snippet counts its own executions, so tests can prove refused code never ran.
const probeCode = providerCode({ before: countRuns('schema') });
const megaPlayCode = extractorCode('MegaPlay', { before: countRuns('schema') });

const extension = (overrides: Record<string, unknown> = {}) =>
  extensionEntry(probeCode, { extractors: ['MegaPlay'], lastUpdated: '2026-10-15T00:00:00Z', ...overrides });
const extractor = (overrides: Record<string, unknown> = {}) => extractorEntry('MegaPlay', megaPlayCode, overrides);
const registryOf = (extensions: unknown[] = [extension()], extractors: unknown[] = [extractor()]) =>
  registryWith(extensions, extractors);

const omit = <T extends object>(entry: T, ...keys: string[]) =>
  Object.fromEntries(Object.entries(entry).filter(([key]) => !keys.includes(key)));

const errorOf = (run: () => unknown): RegistryError => {
  const error = thrownBy(run);
  expect(error).toBeInstanceOf(RegistryError);
  return error;
};
const registryRejectionOf = async (promise: Promise<unknown>): Promise<RegistryError> => {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(RegistryError);
  return error;
};

let fetch: FetchSpy;
beforeEach(() => {
  resetRuns();
  fetch = serveFiles(() => probeCode);
});
afterEach(() => jest.restoreAllMocks());

describe('registry schema (REG-4)', () => {
  it('accepts the bundled registry, which declares its schema and context versions', () => {
    expect(registry.schemaVersion).toBe(REGISTRY_SCHEMA_VERSION);
    for (const entry of [...registry.extensions, ...registry.extractors]) {
      expect(isCompatibleEntry(entry)).toBe(true);
    }
    expect(validateRegistry(registry).schemaVersion).toBe(REGISTRY_SCHEMA_VERSION);
  });

  it('reads registries and entries published before these fields as version 1', () => {
    // The shape of registries bundled up to 1.5.0: no schemaVersion, minContextVersion, hashes or aliases.
    const legacy = {
      extensions: registry.extensions.map((e) => omit(e, 'minContextVersion', 'sha256', 'distFile')),
      extractors: registry.extractors.map((e) => omit(e, 'minContextVersion', 'sha256', 'distFile', 'aliases')),
    };

    expect(validateRegistry(legacy).schemaVersion).toBe(1);
    const manager = new ProviderManager(legacy as any);
    expect(manager.getAvailableExtensions()).toHaveLength(registry.extensions.length);
    expect(manager.getAvailableExtensions().every((e) => isCompatibleEntry(e))).toBe(true);
    expect(manager.getExtractorManager().getExtractorMetadata('megacloud-hd-1')?.name).toBe('MegaCloud');
  });

  it('ignores fields it does not know, such as the ones apps store with a downloaded registry', () => {
    const stored = {
      updatedAt: '2026-10-15T00:00:00Z',
      registryUrl: 'https://registry.test/extension-registry.json',
      totalExtensions: 1,
      totalExtractors: 1,
      extensions: [extension({ addedLater: { any: 'shape' } })],
      extractors: [extractor({ addedLater: 1 })],
    };

    expect(() => new ProviderManager(stored as any)).not.toThrow();
  });

  it('refuses a registry with a newer schemaVersion and asks for an app update', () => {
    const newer = { ...registryOf(), schemaVersion: REGISTRY_SCHEMA_VERSION + 1 };

    const error = errorOf(() => validateRegistry(newer));
    expect(error.code).toBe('UNSUPPORTED_SCHEMA');
    expect(error.updateRequired).toBe(true);
    expect(error.required).toBe(REGISTRY_SCHEMA_VERSION + 1);
    expect(error.supported).toBe(REGISTRY_SCHEMA_VERSION);
    expect(error.message).toMatch(/update the app/i);
    expect(errorOf(() => new ProviderManager(newer)).code).toBe('UNSUPPORTED_SCHEMA');
    expect(errorOf(() => new ExtractorManager(newer)).code).toBe('UNSUPPORTED_SCHEMA');
  });

  it.each([
    ['nothing', undefined],
    ['a schemaVersion that is not a positive integer', { ...registryOf(), schemaVersion: '1' }],
    ['a null schemaVersion', { ...registryOf(), schemaVersion: null }],
    ['a registry without extractors', { extensions: [] }],
    ['a provider config passed as the registry', { axios: {}, userAgent: 'x' }],
  ])('throws for %s instead of leaving an empty manager', (_label, invalid) => {
    for (const create of [() => new ProviderManager(invalid as any), () => new ExtractorManager(invalid as any)]) {
      const error = errorOf(create);
      expect(error.code).toBe('INVALID_REGISTRY');
      expect(error.updateRequired).toBe(false);
    }
  });

  it('reports every problem with the entry it is in', () => {
    const invalid = registryOf(
      [
        extension({ factoryName: 'create-probe' }),
        extension({ id: '../escape' }),
        extension({ id: 'next', category: 'music', version: 'latest', sha256: 'ABC', extractors: 'MegaPlay' }),
        extension({ id: 'unnamed', name: undefined }),
        extension({ id: 'PROBE' }),
        extension({ id: 'fraction', minContextVersion: 1.5 }),
        extension({ id: 'snake_case', version: '1.0.0-beta.1' }),
      ],
      [extractor({ name: 'Mega Play' }), 'MegaCloud', extractor({ name: 'Mega_Play' })]
    );

    const error = errorOf(() => new ProviderManager(invalid));
    expect(error.code).toBe('INVALID_REGISTRY');
    expect(error.issues).toEqual([
      'extensions[0] (probe): factoryName must be a JavaScript identifier (got "create-probe")',
      'extensions[1] (../escape): id must be letters, digits or "-", starting with a letter or digit (got "../escape")',
      'extensions[2] (next): version must be a version like 1.2.3 (got "latest")',
      'extensions[2] (next): category must be one of anime, movies, manga, light-novels, meta (got "music")',
      'extensions[2] (next): sha256 must be a lowercase hex SHA-256 digest (got "ABC")',
      'extensions[2] (next): extractors must be an array of strings (got "MegaPlay")',
      'extensions[3] (unnamed): name must be a non-empty string (missing)',
      "extensions[4] (PROBE): duplicate id 'PROBE'",
      'extensions[5] (fraction): minContextVersion must be a positive integer (got 1.5)',
      'extensions[6] (snake_case): id must be letters, digits or "-", starting with a letter or digit (got "snake_case")',
      'extensions[6] (snake_case): version must be a version like 1.2.3 (got "1.0.0-beta.1")',
      'extractors[0] (Mega Play): name must be a JavaScript identifier of letters and digits (got "Mega Play")',
      'extractors[1]: must be an object (got "MegaCloud")',
      'extractors[2] (Mega_Play): name must be a JavaScript identifier of letters and digits (got "Mega_Play")',
    ]);
    expect(error.message).toContain('Invalid extension registry (14 problems)');
  });
});

describe('extension context compatibility (REG-4)', () => {
  it('treats an entry without minContextVersion as needing context 1', () => {
    expect(isCompatibleEntry({})).toBe(true);
    expect(isCompatibleEntry({ minContextVersion: CONTEXT_VERSION })).toBe(true);
    expect(isCompatibleEntry({ minContextVersion: NEWER_CONTEXT })).toBe(false);
    expect(isCompatibleEntry({ minContextVersion: '1' })).toBe(false);
    expect(isCompatibleEntry({ minContextVersion: 0 })).toBe(false);
    expect(isCompatibleEntry({ minContextVersion: null })).toBe(false);
  });

  it('reports an entry that needs a newer context as incompatible and does not run it', async () => {
    const manager = new ProviderManager(registryOf([extension({ minContextVersion: NEWER_CONTEXT })]));

    // Still listed, so the app can show it with an "update the app" note
    const metadata = manager.getExtensionMetadata('probe');
    expect(isCompatibleEntry(metadata)).toBe(false);

    const error = await registryRejectionOf(manager.loadExtension('probe'));
    expect(error.code).toBe('INCOMPATIBLE_ENTRY');
    expect(error.updateRequired).toBe(true);
    expect(error.id).toBe('probe');
    expect(error.required).toBe(NEWER_CONTEXT);
    expect(error.supported).toBe(CONTEXT_VERSION);
    expect(error.message).toBe(
      `Extension 'probe' needs extension context ${NEWER_CONTEXT}, but this app has ${CONTEXT_VERSION}. ` +
        'Update the app to use it.'
    );
    expect((await registryRejectionOf(manager.getAnimeProvider('probe'))).code).toBe('INCOMPATIBLE_ENTRY');

    expect(fetch).not.toHaveBeenCalled();
    expect(runsOf('schema')).toBe(0);
  });

  it('refuses an incompatible provider when the app runs code it cached itself', async () => {
    const manager = new ProviderManager(registryOf([]));
    const metadata = extension({ minContextVersion: NEWER_CONTEXT }) as any;

    // executeProviderCode(code, { ...metadata, factoryName: factoryName }) is how apps run cached extension code
    const refused = await registryRejectionOf(manager.executeProviderCode(probeCode, metadata));
    expect(refused.code).toBe('INCOMPATIBLE_ENTRY');
    const skipped = manager.executeProviderCode(probeCode, metadata, { skipIntegrity: true });
    expect((await registryRejectionOf(skipped)).code).toBe('INCOMPATIBLE_ENTRY');
    expect(runsOf('schema')).toBe(0);

    await manager.executeProviderCode(probeCode, { ...metadata, minContextVersion: CONTEXT_VERSION, factoryName: 'createProbe' });
    expect(runsOf('schema')).toBe(1);
  });

  it('refuses an incompatible extractor when loading it and when running cached code', async () => {
    const manager = new ExtractorManager(
      registryOf([], [extractor({ minContextVersion: NEWER_CONTEXT })])
    );
    const metadata = manager.getExtractorMetadata('MegaPlay')!;

    const loaded = await registryRejectionOf(manager.loadExtractor('megaplay-hd-1'));
    expect(loaded.code).toBe('INCOMPATIBLE_ENTRY');
    expect(loaded.message).toMatch(/^Extractor 'MegaPlay' needs extension context/);
    expect((await registryRejectionOf(manager.executeExtractorCode(megaPlayCode, metadata))).code).toBe('INCOMPATIBLE_ENTRY');

    expect(fetch).not.toHaveBeenCalled();
    expect(runsOf('schema')).toBe(0);
  });

  it('only needs the id of an entry that needs a newer context, which may use fields this version lacks', async () => {
    const fromTheFuture = { id: 'future', category: 'music', minContextVersion: NEWER_CONTEXT, layout: 'v2' };
    const manager = new ProviderManager(registryOf([extension(), fromTheFuture], [extractor()]));

    expect(manager.getExtensionMetadata('future')).toMatchObject({ id: 'future' });
    expect((await registryRejectionOf(manager.loadExtension('future'))).code).toBe('INCOMPATIBLE_ENTRY');

    const unnamed = registryOf([{ minContextVersion: NEWER_CONTEXT }]);
    expect(errorOf(() => validateRegistry(unnamed)).issues).toEqual([
      'extensions[0]: id must be letters, digits or "-", starting with a letter or digit (missing)',
    ]);
  });
});
