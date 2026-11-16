import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { IntegrityError, sha256Hex, verifyExtensionCode } from '../../src/utils/extension-integrity';
import registry from '../../src/extension-registry.json';
import { rejectionOf, thrownBy } from './helpers/errors';
import {
  countRuns,
  extensionEntry,
  extractorCode as extractorSource,
  extractorEntry,
  providerCode as providerSource,
  registryOf,
  resetRuns,
  runsOf,
} from './helpers/registry';

const emptyRegistry = registryOf();

// Each snippet counts its own executions, so tests can prove rejected code never ran.
const providerCode = providerSource({ before: countRuns('code') });
const extractorCode = extractorSource('TestExtractor', { before: countRuns('code') });

const providerManifest = (overrides: Record<string, unknown> = {}) => extensionEntry(providerCode, overrides);
const extractorManifest = (overrides: Record<string, unknown> = {}) =>
  extractorEntry('TestExtractor', extractorCode, overrides);

const expectIntegrityError = async (promise: Promise<unknown>, code: IntegrityError['code']) => {
  const error = await rejectionOf(promise);
  expect(error).toBeInstanceOf(IntegrityError);
  expect((error as IntegrityError).code).toBe(code);
};

beforeEach(resetRuns);

describe('verifyExtensionCode', () => {
  it('accepts code matching the manifest hash', () => {
    expect(() => verifyExtensionCode(providerCode, providerManifest())).not.toThrow();
  });

  it('rejects a mismatching hash with the expected and actual values', () => {
    const error = thrownBy(() => verifyExtensionCode(providerCode + '\n// tampered', providerManifest()));

    expect(error).toBeInstanceOf(IntegrityError);
    expect(error).toMatchObject({ code: 'INTEGRITY_MISMATCH', expected: sha256Hex(providerCode) });
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
    const instance: any = await manager.executeProviderCode(providerCode, providerManifest());
    expect(instance.name).toBe('Probe');
    expect(runsOf('code')).toBe(1);
  });

  it('rejects a mismatching hash before running the code', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, providerManifest({ sha256: 'f'.repeat(64) })),
      'INTEGRITY_MISMATCH'
    );
    expect(runsOf('code')).toBe(0);
  });

  it('rejects an unhashed entry unless the manager allows it', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, providerManifest({ sha256: undefined })),
      'INTEGRITY_MISSING'
    );

    const permissive = new ProviderManager(emptyRegistry, {}, { allowUnhashed: true });
    await permissive.executeProviderCode(providerCode, providerManifest({ sha256: undefined }));
    expect(runsOf('code')).toBe(1);
  });

  it('runs unverified code only with an explicit skipIntegrity', async () => {
    await manager.executeProviderCode(providerCode, providerManifest({ sha256: 'f'.repeat(64) }), {
      skipIntegrity: true,
    });
    expect(runsOf('code')).toBe(1);
  });

  it('rejects a factory name that is not a plain identifier', async () => {
    await expectIntegrityError(
      manager.executeProviderCode(providerCode, { ...providerManifest(), factoryName: 'x; globalThis.__runs.code = 99; //' }),
      'INVALID_IDENTIFIER'
    );
    expect(runsOf('code')).toBe(0);
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
    expect(runsOf('code')).toBe(1);
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
    expect(runsOf('code')).toBe(0);
  });

  it('rejects an extractor name that is not a plain identifier', async () => {
    await expectIntegrityError(
      new ExtractorManager(emptyRegistry).executeExtractorCode(
        extractorCode,
        extractorManifest({ name: 'TestExtractor; globalThis.__runs.code = 99' })
      ),
      'INVALID_IDENTIFIER'
    );
    expect(runsOf('code')).toBe(0);
  });
});
