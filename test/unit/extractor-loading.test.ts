import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import createProviderContext from '../../src/utils/create-provider-context';
import { defaultExtractors } from '../../src/utils/create-provider-context';
import { sha256Hex } from '../../src/utils/extension-integrity';

// Registry-only provider: its factory reaches extractors through ctx.extractors only.
const providerCode = `
function createProbe(ctx, baseUrl) {
  return {
    name: 'Probe',
    baseUrl,
    search: async () => ({ results: [] }),
    fetchEpisodeServers: async () => [],
    fetchEpisodeSources: async () => ({ sources: [] }),
    fetchAnimeInfo: async () => ({ id: '', title: '' }),
    play: (url) => ctx.extractors.MegaPlay().extract(new ctx.PolyURL(url)),
    missing: () => ctx.extractors.NoSuchHost().extract('https://x.test'),
  };
}
`;
const extractorCode = `
function MegaPlay(ctx) {
  return { serverName: 'megaplay', sources: [], extract: async (url) => ({ sources: [{ url: 'registry:' + url.href }] }) };
}
`;
const PROVIDER_URL = 'https://registry.test/registry/extensions/probe/1.0.0.js';
const EXTRACTOR_URL = 'https://registry.test/registry/extractors/megaplay/1.0.0.js';

const registryWith = (extractorSha = sha256Hex(extractorCode)) =>
  ({
    extensions: [
      {
        id: 'probe',
        name: 'Probe',
        description: 'Registry-only test provider',
        version: '1.0.0',
        author: { name: 'Tests' },
        category: 'anime',
        main: PROVIDER_URL,
        factoryName: 'createProbe',
        sha256: sha256Hex(providerCode),
        baseUrl: 'https://probe.test',
        logo: '',
        status: 'beta',
        lastUpdated: '2026-10-15T00:00:00Z',
        extractors: ['MegaPlay'],
      },
    ],
    extractors: [{ name: 'MegaPlay', version: '1.0.0', main: EXTRACTOR_URL, sha256: extractorSha }],
  }) as any;

const realFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn(async (url: any) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => (String(url) === EXTRACTOR_URL ? extractorCode : providerCode),
  }));
  global.fetch = fetchMock as any;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

const extractorFetches = () => fetchMock.mock.calls.filter(([url]) => String(url) === EXTRACTOR_URL).length;

describe('registry extractors through one shared manager (EXT-3)', () => {
  it('runs the registry version of an extractor, fetched once', async () => {
    const provider: any = await new ProviderManager(registryWith()).loadExtension('probe');

    await expect(provider.play('https://megaplay.test/e/1')).resolves.toEqual({
      sources: [{ url: 'registry:https://megaplay.test/e/1' }],
    });
    await provider.play('https://megaplay.test/e/2');

    expect(extractorFetches()).toBe(1);
  });

  it('falls back to the bundled extractor when the registry code fails its hash', async () => {
    const bundledExtract = jest.fn(async () => ({ sources: [{ url: 'bundled' }] }));
    jest.spyOn(defaultExtractors, 'MegaPlay').mockImplementation(
      () => ({ serverName: 'megaplay', sources: [], extract: bundledExtract }) as any
    );

    const provider: any = await new ProviderManager(registryWith('0'.repeat(64))).loadExtension('probe');

    await expect(provider.play('https://megaplay.test/e/1')).resolves.toEqual({ sources: [{ url: 'bundled' }] });
    expect(bundledExtract).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error for an extractor that is neither in the registry nor bundled', async () => {
    const provider: any = await new ProviderManager(registryWith()).loadExtension('probe');

    await expect(provider.missing()).rejects.toThrow("Extractor 'NoSuchHost' not found");
  });

  it('runs extractors through the manager the app passes in', async () => {
    const registry = registryWith();
    const shared = new ExtractorManager(registry);
    const load = jest.spyOn(shared, 'loadExtractorFactory');
    const provider: any = await new ProviderManager(registry, { extractorManager: shared }).loadExtension('probe');

    await expect(provider.play('https://megaplay.test/e/1')).resolves.toEqual({
      sources: [{ url: 'registry:https://megaplay.test/e/1' }],
    });
    expect(load).toHaveBeenCalledWith('MegaPlay');
  });

  it('runs the bundled extractor, with the provider context, when no manager is configured', async () => {
    const extract = jest.fn(async () => ({ sources: [] }));
    const megaPlay = jest.spyOn(defaultExtractors, 'MegaPlay').mockImplementation(() => ({ extract }));
    const ctx = createProviderContext();

    await ctx.extractors.MegaPlay().extract('https://megaplay.test/e/1');

    expect(megaPlay).toHaveBeenCalledWith(ctx);
    expect(extract).toHaveBeenCalledWith('https://megaplay.test/e/1');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
