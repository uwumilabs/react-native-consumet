import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { IntegrityError, sha256Hex, verifyExtensionCode } from '../../src/utils/extension-integrity';
import registry from '../../src/extension-registry.json';

declare global {
  // eslint-disable-next-line no-var
  var __extensionRuns: number;
}

const emptyRegistry = { extensions: [], extractors: [] } as any;

// Each snippet counts its own executions, so tests can prove rejected code never ran.
const providerCode = `
globalThis.__extensionRuns = (globalThis.__extensionRuns || 0) + 1;
function createTestProvider(ctx) {
  return {
    name: 'TestProvider',
    search: async () => ({ results: [] }),
    fetchAnimeInfo: async () => ({}),
    fetchEpisodeSources: async () => ({ sources: [] }),
    fetchEpisodeServers: async () => [],
  };
}
exports.createTestProvider = createTestProvider;
`;

const extractorCode = `
globalThis.__extensionRuns = (globalThis.__extensionRuns || 0) + 1;
function TestExtractor(ctx) {
  return { serverName: 'TestExtractor', sources: [], extract: async () => ({ sources: [] }) };
}
exports.TestExtractor = TestExtractor;
`;

const providerManifest = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'testprovider',
    name: 'TestProvider',
    category: 'anime',
    factoryName: 'createTestProvider',
    sha256: sha256Hex(providerCode),
    ...overrides,
  }) as any;

const extractorManifest = (overrides: Record<string, unknown> = {}) =>
  ({ name: 'TestExtractor', version: '1.0.0', main: 'local', sha256: sha256Hex(extractorCode), ...overrides }) as any;

const expectIntegrityError = async (promise: Promise<unknown>, code: IntegrityError['code']) => {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(IntegrityError);
  expect((error as IntegrityError).code).toBe(code);
};

beforeEach(() => {
  globalThis.__extensionRuns = 0;
});

describe('verifyExtensionCode', () => {
  it('accepts code matching the manifest hash', () => {
    expect(() => verifyExtensionCode(providerCode, providerManifest())).not.toThrow();
  });

  it('rejects a mismatching hash with the expected and actual values', () => {
    try {
      verifyExtensionCode(providerCode + '\n// tampered', providerManifest());
      throw new Error('expected IntegrityError');
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrityError);
      expect((e as IntegrityError).code).toBe('INTEGRITY_MISMATCH');
      expect((e as IntegrityError).expected).toBe(sha256Hex(providerCode));
    }
  });

  it('rejects a missing hash unless allowUnhashed is set', () => {
    expect(() => verifyExtensionCode(providerCode, providerManifest({ sha256: undefined }))).toThrow(IntegrityError);
    expect(() =>
      verifyExtensionCode(providerCode, providerManifest({ sha256: undefined }), { allowUnhashed: true })
    ).not.toThrow();
  });
});

describe('ProviderManager.executeProviderCode (REG-2)', () => {
  const manager = new ProviderManager(emptyRegistry);

  it('runs code whose hash matches', async () => {
    const instance: any = await manager.executeProviderCode(providerCode, 'createTestProvider', providerManifest());
    expect(instance.name).toBe('TestProvider');
    expect(globalThis.__extensionRuns).toBe(1);
  });

  it('rejects a mismatching hash before running the code', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, 'createTestProvider', providerManifest({ sha256: 'f'.repeat(64) })),
      'INTEGRITY_MISMATCH'
    );
    expect(globalThis.__extensionRuns).toBe(0);
  });

  it('rejects an unhashed entry unless the manager allows it', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, 'createTestProvider', providerManifest({ sha256: undefined })),
      'INTEGRITY_MISSING'
    );

    const permissive = new ProviderManager(emptyRegistry, {}, { allowUnhashed: true });
    await permissive.executeProviderCode(providerCode, 'createTestProvider', providerManifest({ sha256: undefined }));
    expect(globalThis.__extensionRuns).toBe(1);
  });

  it('runs unverified code only with an explicit skipIntegrity', async () => {
    await manager.executeProviderCode(providerCode, 'createTestProvider', providerManifest({ sha256: 'f'.repeat(64) }), {
      skipIntegrity: true,
    });
    expect(globalThis.__extensionRuns).toBe(1);
  });

  it('rejects a factory name that is not a plain identifier', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, 'x; globalThis.__extensionRuns = 99; //', providerManifest()),
      'INVALID_IDENTIFIER'
    );
    expect(globalThis.__extensionRuns).toBe(0);
  });
});

describe('ExtractorManager (REG-3)', () => {
  it('keeps sha256 from registry entries', () => {
    const manager = new ExtractorManager(registry as any);
    for (const entry of registry.extractors) {
      expect(manager.getExtractorMetadata(entry.name)?.sha256).toBe(entry.sha256);
    }
  });

  it('runs extractor code whose hash matches', async () => {
    const extractor = await new ExtractorManager(emptyRegistry).executeExtractorCode(extractorCode, extractorManifest());
    expect(typeof extractor.extract).toBe('function');
    expect(globalThis.__extensionRuns).toBe(1);
  });

  it('rejects mismatched and unhashed extractor code before running it', async () => {
    const manager = new ExtractorManager(emptyRegistry);
    await expectIntegrityError(
      manager.executeExtractorCode(extractorCode, extractorManifest({ sha256: 'f'.repeat(64) })),
      'INTEGRITY_MISMATCH'
    );
    await expectIntegrityError(
      manager.executeExtractorCode(extractorCode, extractorManifest({ sha256: undefined })),
      'INTEGRITY_MISSING'
    );
    expect(globalThis.__extensionRuns).toBe(0);
  });

  it('rejects an extractor name that is not a plain identifier', async () => {
    await expectIntegrityError(
      new ExtractorManager(emptyRegistry).executeExtractorCode(
        extractorCode,
        extractorManifest({ name: 'TestExtractor; globalThis.__extensionRuns = 99' })
      ),
      'INVALID_IDENTIFIER'
    );
    expect(globalThis.__extensionRuns).toBe(0);
  });
});
