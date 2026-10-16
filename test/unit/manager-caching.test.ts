import axios from 'axios';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { IntegrityError, sha256Hex } from '../../src/utils/extension-integrity';
import { defaultExtractors } from '../../src/utils/extension-utils';
import AsianLoad from '../../src/extractors/asianload';

declare global {
  // eslint-disable-next-line no-var
  var __managerRuns: Record<string, number>;
}

// Each snippet counts its own executions, so tests can tell a cached load from a new one.
const providerCode = (version: string) => `
globalThis.__managerRuns.probe = (globalThis.__managerRuns.probe || 0) + 1;
function createProbe(ctx, baseUrl) {
  return {
    name: 'Probe',
    version: '${version}',
    baseUrl,
    search: async () => ({ results: [] }),
    fetchAnimeInfo: async () => ({}),
    fetchEpisodeSources: async () => ({ sources: [] }),
    fetchEpisodeServers: async () => [],
  };
}
exports.createProbe = createProbe;
`;
const extractorCode = (version: string) => `
globalThis.__managerRuns.megacloud = (globalThis.__managerRuns.megacloud || 0) + 1;
function MegaCloud(ctx) {
  return { serverName: 'MegaCloud', sources: [], extract: async () => ({ sources: [{ url: 'registry ${version}' }] }) };
}
exports.MegaCloud = MegaCloud;
`;
const PROVIDER_URL = 'https://registry.test/registry/extensions/probe/1.0.0.js';
const EXTRACTOR_URL = 'https://registry.test/registry/extractors/megacloud/1.0.0.js';

const extension = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'probe',
    name: 'Probe',
    description: 'Test provider',
    version: '1.0.0',
    author: { name: 'Tests' },
    category: 'anime',
    main: PROVIDER_URL,
    factoryName: 'createProbe',
    sha256: sha256Hex(providerCode('1')),
    baseUrl: 'https://probe.test',
    logo: '',
    status: 'beta',
    lastUpdated: '2026-10-16T00:00:00Z',
    extractors: ['MegaCloud'],
    ...overrides,
  }) as any;
const megaCloud = (overrides: Record<string, unknown> = {}) =>
  ({
    name: 'MegaCloud',
    aliases: ['upcloud'],
    version: '1.0.0',
    main: EXTRACTOR_URL,
    sha256: sha256Hex(extractorCode('1')),
    ...overrides,
  }) as any;
const registryOf = (extensions: unknown[] = [extension()], extractors: unknown[] = [megaCloud()]) =>
  ({ extensions, extractors }) as any;
const emptyRegistry = registryOf([], []);

const ok = (body: string) => ({ ok: true, status: 200, statusText: 'OK', text: async () => body });

const realFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  globalThis.__managerRuns = {};
  fetchMock = jest.fn(async (url: any) => ok(String(url) === EXTRACTOR_URL ? extractorCode('1') : providerCode('1')));
  global.fetch = fetchMock as any;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

const fetchesOf = (url: string) => fetchMock.mock.calls.filter(([called]) => String(called) === url).length;

const rejectionOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => error
  );

describe('one load per extension or extractor (UTIL-2)', () => {
  it('shares one fetch between concurrent loads of the same extension', async () => {
    const manager = new ProviderManager(registryOf());

    const [first, byName, byGetter] = await Promise.all([
      manager.loadExtension('probe'),
      manager.loadExtension('Probe'),
      manager.getAnimeProvider('probe'),
    ]);

    expect(fetchesOf(PROVIDER_URL)).toBe(1);
    expect(globalThis.__managerRuns.probe).toBe(1);
    expect(byName).toBe(first);
    expect(byGetter).toBe(first);
    expect(await manager.loadExtension('probe')).toBe(first);
    expect(fetchesOf(PROVIDER_URL)).toBe(1);
  });

  it('retries a load that failed instead of caching the failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable', text: async () => '' });
    const manager = new ProviderManager(registryOf());

    const [failed, sameAttempt] = await Promise.all([
      rejectionOf(manager.loadExtension('probe')),
      rejectionOf(manager.loadExtension('probe')),
    ]);
    expect((failed as Error).message).toMatch(/503/);
    expect(sameAttempt).toBe(failed);

    await expect(manager.loadExtension('probe')).resolves.toMatchObject({ name: 'Probe' });
    expect(fetchesOf(PROVIDER_URL)).toBe(2);
  });

  it('loads an extractor once for every server name it serves (megacloud-hd-1, MegaCloud, upcloud)', async () => {
    const manager = new ExtractorManager(registryOf([], [megaCloud()]));

    const [suffixed, named, aliased] = await Promise.all([
      manager.loadExtractor('megacloud-hd-1'),
      manager.loadExtractor('MegaCloud'),
      manager.loadExtractor('upcloud'),
    ]);

    expect(fetchesOf(EXTRACTOR_URL)).toBe(1);
    expect(globalThis.__managerRuns.megacloud).toBe(1);
    expect(named).toBe(suffixed);
    expect(aliased).toBe(suffixed);
    expect(await manager.loadExtractor('megacloud-hd-2')).toBe(suffixed);
  });

  it('shares extractor loads between the providers of one manager', async () => {
    const providerCalling = `
      function createProbe(ctx) {
        return {
          name: 'Probe',
          search: async () => ({ results: [] }),
          fetchAnimeInfo: async () => ({}),
          fetchEpisodeSources: (url) => ctx.extractors.MegaCloud().extract(url),
          fetchEpisodeServers: async () => [],
        };
      }`;
    fetchMock.mockImplementation(async (url: any) =>
      ok(String(url) === EXTRACTOR_URL ? extractorCode('1') : providerCalling)
    );
    const manager = new ProviderManager(registryOf([extension({ sha256: sha256Hex(providerCalling) })]));
    const provider = await manager.getAnimeProvider('probe');

    await Promise.all([provider.fetchEpisodeSources('https://a.test'), provider.fetchEpisodeSources('https://b.test')]);
    await manager.getExtractorManager().loadExtractor('megacloud-hd-1');

    expect(fetchesOf(EXTRACTOR_URL)).toBe(1);
  });
});

describe('compiled code is memoised by id and sha256 (UTIL-2)', () => {
  const v1 = providerCode('1');
  const v2 = providerCode('2');
  const v1Meta = extension();
  const v2Meta = extension({ version: '1.1.0', sha256: sha256Hex(v2) });

  it('compiles the same verified provider code once, and builds a new instance per call', async () => {
    const manager = new ProviderManager(emptyRegistry);

    const first = await manager.executeProviderCode(v1, 'createProbe', v1Meta);
    const second = await manager.executeProviderCode(v1, 'createProbe', v1Meta, { baseUrl: 'https://mirror.test' });

    expect(globalThis.__managerRuns.probe).toBe(1);
    expect(second).not.toBe(first);
    expect((second as any).baseUrl).toBe('https://mirror.test');
  });

  it('runs the new provider code when the sha256 changes', async () => {
    const manager = new ProviderManager(emptyRegistry);

    expect(await manager.executeProviderCode(v1, 'createProbe', v1Meta)).toMatchObject({ version: '1' });
    expect(await manager.executeProviderCode(v2, 'createProbe', v2Meta)).toMatchObject({ version: '2' });
    expect(globalThis.__managerRuns.probe).toBe(2);
  });

  it('runs the new extractor code when the sha256 changes', async () => {
    const manager = new ExtractorManager(emptyRegistry);
    const v2Code = extractorCode('2');

    const first = await manager.executeExtractorCode(extractorCode('1'), megaCloud());
    const again = await manager.executeExtractorCode(extractorCode('1'), megaCloud());
    const updated = await manager.executeExtractorCode(v2Code, megaCloud({ version: '1.1.0', sha256: sha256Hex(v2Code) }));

    await expect(first.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'registry 1' }] });
    await expect(updated.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'registry 2' }] });
    expect(again).not.toBe(first);
    expect(globalThis.__managerRuns.megacloud).toBe(2);
  });

  it('still rejects tampered code that claims a hash it verified before', async () => {
    const manager = new ProviderManager(emptyRegistry);
    await manager.executeProviderCode(v1, 'createProbe', v1Meta);

    const error = await rejectionOf(manager.executeProviderCode(v2, 'createProbe', v1Meta));
    expect(error).toBeInstanceOf(IntegrityError);
    expect((error as IntegrityError).code).toBe('INTEGRITY_MISMATCH');
    expect(globalThis.__managerRuns.probe).toBe(1);
  });

  it('never reuses code that ran with skipIntegrity for a verified call', async () => {
    const manager = new ProviderManager(emptyRegistry);
    const unverified = extension({ sha256: 'f'.repeat(64) });
    await manager.executeProviderCode(v1, 'createProbe', unverified, { skipIntegrity: true });

    const error = await rejectionOf(manager.executeProviderCode(v1, 'createProbe', unverified));
    expect((error as IntegrityError).code).toBe('INTEGRITY_MISMATCH');
  });
});

describe('invalidate (UTIL-2)', () => {
  it('makes the next provider load fetch and run the code again, for every base URL', async () => {
    const manager = new ProviderManager(registryOf());
    const first = await manager.loadExtension('probe');
    const mirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.test' });

    manager.invalidate('Probe');

    const reloaded = await manager.loadExtension('probe');
    const remirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.test' });
    expect(reloaded).not.toBe(first);
    expect(remirrored).not.toBe(mirrored);
    expect(fetchesOf(PROVIDER_URL)).toBe(4);
    expect(globalThis.__managerRuns.probe).toBe(2);
  });

  it('makes the next extractor load fetch again, by any of its server names', async () => {
    const manager = new ExtractorManager(registryOf([], [megaCloud()]));
    const first = await manager.loadExtractor('megacloud-hd-1');

    manager.invalidate('upcloud');

    expect(await manager.loadExtractor('MegaCloud')).not.toBe(first);
    expect(fetchesOf(EXTRACTOR_URL)).toBe(2);
    expect(globalThis.__managerRuns.megacloud).toBe(2);
  });

  it('ignores ids that were never loaded', () => {
    expect(() => new ProviderManager(registryOf()).invalidate('nothing')).not.toThrow();
    expect(() => new ExtractorManager(registryOf()).invalidate('nothing')).not.toThrow();
  });
});

describe('bundled extractor fallback returns an instance (UTIL-2)', () => {
  it("builds a bundled extractor the registry lacks with the manager's context", async () => {
    const appAxios = axios.create();
    const kwik = jest.spyOn(defaultExtractors, 'Kwik');
    const manager = new ExtractorManager(emptyRegistry, { axios: appAxios });

    const extractor = await manager.loadExtractor('kwik-pahe');

    expect(typeof extractor.extract).toBe('function');
    expect(kwik).toHaveBeenCalledTimes(1);
    expect(kwik.mock.calls[0]![0].axios).toBe(appAxios);
    expect(await manager.loadExtractor('Kwik')).toBe(extractor);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates class-based bundled extractors with new', async () => {
    const extractor = await new ExtractorManager(emptyRegistry).loadExtractor('asianload');

    expect(extractor).toBeInstanceOf(AsianLoad);
    expect(typeof extractor.extract).toBe('function');
  });

  it('falls back to the bundled extractor of the base name when the registry code fails its hash', async () => {
    const bundledExtract = jest.fn(async () => ({ sources: [{ url: 'bundled' }] }));
    jest
      .spyOn(defaultExtractors, 'MegaCloud')
      .mockImplementation(() => ({ serverName: 'MegaCloud', sources: [], extract: bundledExtract }) as any);
    const manager = new ExtractorManager(registryOf([], [megaCloud({ sha256: '0'.repeat(64) })]));

    const extractor = await manager.loadExtractor('megacloud-hd-1');

    await expect(extractor.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'bundled' }] });
    expect(globalThis.__managerRuns.megacloud).toBeUndefined();
  });

  it('builds legacy static:// registry entries', async () => {
    const manager = new ExtractorManager(registryOf([], [{ name: 'Kwik', version: '1.0.0', main: 'static://Kwik' }]));

    const extractor = await manager.loadExtractor('kwik-pahe');

    expect(typeof extractor.extract).toBe('function');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('factory lookup (UTIL-2)', () => {
  const provider = (version: string) =>
    `(ctx, baseUrl) => ({ name: 'Probe', version: '${version}', search() {}, fetchAnimeInfo() {}, ` +
    'fetchEpisodeSources() {}, fetchEpisodeServers() {} })';
  const run = (code: string) =>
    new ProviderManager(emptyRegistry).executeProviderCode(code, 'createProbe', extension({ sha256: sha256Hex(code) }));

  it('finds a provider factory that is only the default export', async () => {
    // What a strict-mode bundle of `export default` looks like: nothing named createProbe is in scope.
    const code = `"use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      const factory = ${provider('default')};
      exports.default = factory;`;

    await expect(run(code)).resolves.toMatchObject({ version: 'default' });
  });

  it('finds a default export assigned to module.exports', async () => {
    await expect(run(`module.exports = { default: ${provider('module default')} };`)).resolves.toMatchObject({
      version: 'module default',
    });
  });

  it('prefers the named export over the default export', async () => {
    const code = `exports.default = ${provider('default')}; exports.createProbe = ${provider('named')};`;
    await expect(run(code)).resolves.toMatchObject({ version: 'named' });
  });

  it('finds an extractor that is only the default export', async () => {
    const code = `exports.default = (ctx) => ({ serverName: 'Probe', sources: [], extract: async () => 'default' });`;
    const extractor = await new ExtractorManager(emptyRegistry).executeExtractorCode(code, {
      name: 'Probe',
      version: '1.0.0',
      main: 'https://registry.test/probe.js',
      sha256: sha256Hex(code),
    });

    await expect(extractor.extract(undefined as any)).resolves.toBe('default');
  });
});
