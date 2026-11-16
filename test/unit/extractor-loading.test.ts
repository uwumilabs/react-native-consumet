import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { defaultExtractors } from '../../src/utils/create-extractor-context';
import {
  extensionEntry,
  extensionUrl,
  extractorCode,
  extractorEntry,
  extractorUrl,
  providerCode,
  registryOf,
  serveFiles,
  type FetchSpy,
} from './helpers/registry';

// Registry-only provider: its factory reaches extractors through ctx.extractors only.
const probeCode = providerCode({
  members: `
    play: (url) => ctx.extractors.MegaPlay().extract(new ctx.PolyURL(url)),
    missing: () => ctx.extractors.NoSuchHost().extract('https://x.test'),`,
});
const megaPlayCode = extractorCode('MegaPlay', { extract: `async (url) => ({ sources: [{ url: 'registry:' + url.href }] })` });
const registry = () =>
  registryOf([extensionEntry(probeCode, { extractors: ['MegaPlay'] })], [extractorEntry('MegaPlay', megaPlayCode)]);

let fetch: FetchSpy;
beforeEach(() => {
  fetch = serveFiles({ [extensionUrl('probe')]: probeCode, [extractorUrl('MegaPlay')]: megaPlayCode });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('registry extractors through one shared manager (EXT-3)', () => {
  it('runs the registry version of an extractor', async () => {
    const provider: any = await new ProviderManager(registry()).loadExtension('probe');

    await expect(provider.play('https://megaplay.test/e/1')).resolves.toEqual({
      sources: [{ url: 'registry:https://megaplay.test/e/1' }],
    });
  });

  it('throws a clear error for an extractor that is neither in the registry nor bundled', async () => {
    const provider: any = await new ProviderManager(registry()).loadExtension('probe');

    await expect(provider.missing()).rejects.toThrow("Extractor 'NoSuchHost' not found");
  });

  it('runs extractors through the manager the app passes in', async () => {
    const shared = new ExtractorManager(registry());
    const load = jest.spyOn(shared, 'loadExtractorFactory');
    const provider: any = await new ProviderManager(registry(), { extractorManager: shared }).loadExtension('probe');

    await expect(provider.play('https://megaplay.test/e/1')).resolves.toEqual({
      sources: [{ url: 'registry:https://megaplay.test/e/1' }],
    });
    expect(load).toHaveBeenCalledWith('MegaPlay');
  });

  it('runs the bundled extractor, with the provider context, when no manager is configured', async () => {
    const extract = jest.fn(async () => ({ sources: [] }));
    const megaPlay = jest.spyOn(defaultExtractors, 'MegaPlay').mockImplementation(() => ({ extract }));
    const ctx = createProviderContext();

    // Registry bundles call ctx.extractors.X() without a context; the provider's is used.
    await (ctx.extractors.MegaPlay as () => ReturnType<typeof ctx.extractors.MegaPlay>)().extract('https://megaplay.test/e/1');

    expect(megaPlay).toHaveBeenCalledWith(ctx);
    expect(extract).toHaveBeenCalledWith('https://megaplay.test/e/1');
    expect(fetch).not.toHaveBeenCalled();
  });
});
