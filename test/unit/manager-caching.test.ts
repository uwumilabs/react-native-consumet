import axios from 'axios';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { IntegrityError, sha256Hex } from '../../src/utils/extension-integrity';
import { defaultExtractors } from '../../src/utils/create-extractor-context';
import { CONTEXT_VERSION } from '../../src/utils/registry-schema';
import { rejectionOf } from './helpers/errors';
import {
  countRuns,
  extensionEntry,
  extensionUrl,
  extractorCode,
  extractorEntry,
  extractorUrl,
  fetchesOf,
  providerCode,
  registryOf,
  resetRuns,
  runsOf,
  serveFiles,
  type FetchSpy,
} from './helpers/registry';

// Each snippet counts its own executions, so tests can tell a cached load from a new one.
const probeCode = (version: string, members = '') =>
  providerCode({ before: countRuns('probe'), members: `version: '${version}', ${members}` });
const megaCloudCode = (version: string) =>
  extractorCode('MegaCloud', {
    before: countRuns('megacloud'),
    extract: `async () => ({ sources: [{ url: 'registry ${version}' }] })`,
  });
const PROVIDER_URL = extensionUrl('probe');
const EXTRACTOR_URL = extractorUrl('MegaCloud');

const probe = (overrides: Record<string, unknown> = {}) =>
  extensionEntry(probeCode('1'), { extractors: ['MegaCloud'], ...overrides });
const megaCloud = (overrides: Record<string, unknown> = {}) =>
  extractorEntry('MegaCloud', megaCloudCode('1'), { aliases: ['upcloud'], ...overrides });
const fullRegistry = () => registryOf([probe()], [megaCloud()]);
const emptyRegistry = registryOf();

let fetch: FetchSpy;
beforeEach(() => {
  resetRuns();
  fetch = serveFiles({ [PROVIDER_URL]: probeCode('1'), [EXTRACTOR_URL]: megaCloudCode('1') });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('one load per extension or extractor (UTIL-2)', () => {
  it('shares one fetch between concurrent loads of the same extension', async () => {
    const manager = new ProviderManager(fullRegistry());

    const [first, byName, byGetter] = await Promise.all([
      manager.loadExtension('probe'),
      manager.loadExtension('Probe'),
      manager.getAnimeProvider('probe'),
    ]);

    expect(fetchesOf(fetch, PROVIDER_URL)).toBe(1);
    expect(runsOf('probe')).toBe(1);
    expect(byName).toBe(first);
    expect(byGetter).toBe(first);
    expect(await manager.getProvider('anime', 'probe')).toBe(first);
    expect(fetchesOf(fetch, PROVIDER_URL)).toBe(1);
  });

  it('keeps one instance per base URL', async () => {
    const manager = new ProviderManager(fullRegistry());

    const first = await manager.loadExtension('probe');
    const mirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.test' });

    expect(await manager.loadExtension('probe')).toBe(first);
    expect(await manager.getAnimeProvider('probe', { baseUrl: 'https://mirror.test' })).toBe(mirrored);
    expect(mirrored).not.toBe(first);
    expect([(first as any).baseUrl, (mirrored as any).baseUrl]).toEqual(['https://probe.test', 'https://mirror.test']);
  });

  it('retries a load that failed instead of caching the failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable', text: async () => '' });
    const manager = new ProviderManager(fullRegistry());

    const [failed, sameAttempt] = await Promise.all([
      rejectionOf(manager.loadExtension('probe')),
      rejectionOf(manager.loadExtension('probe')),
    ]);
    expect((failed as Error).message).toMatch(/503/);
    expect(sameAttempt).toBe(failed);

    await expect(manager.loadExtension('probe')).resolves.toMatchObject({ name: 'Probe' });
    expect(fetchesOf(fetch, PROVIDER_URL)).toBe(2);
  });

  it('loads an extractor once for every server name it serves (megacloud-hd-1, MegaCloud, upcloud)', async () => {
    const manager = new ExtractorManager(registryOf([], [megaCloud()]));

    const [suffixed, named, aliased] = await Promise.all([
      manager.loadExtractor('megacloud-hd-1'),
      manager.loadExtractor('MegaCloud'),
      manager.loadExtractor('upcloud'),
    ]);

    expect(fetchesOf(fetch, EXTRACTOR_URL)).toBe(1);
    expect(runsOf('megacloud')).toBe(1);
    expect(named).toBe(suffixed);
    expect(aliased).toBe(suffixed);
    expect(await manager.loadExtractor('megacloud-hd-2')).toBe(suffixed);
  });

  it('shares extractor loads between the providers of one manager', async () => {
    const calling = probeCode('1', 'play: (url) => ctx.extractors.MegaCloud().extract(url),');
    fetch.mockImplementation(async (url: any) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => (String(url) === EXTRACTOR_URL ? megaCloudCode('1') : calling),
    }));
    const manager = new ProviderManager(registryOf([probe({ sha256: sha256Hex(calling) })], [megaCloud()]));
    const provider: any = await manager.getAnimeProvider('probe');

    await expect(provider.play('https://a.test')).resolves.toEqual({ sources: [{ url: 'registry 1' }] });
    await provider.play('https://b.test');
    await manager.getExtractorManager().loadExtractor('megacloud-hd-1');

    expect(fetchesOf(fetch, EXTRACTOR_URL)).toBe(1);
  });
});

describe('compiled code is memoised by id and sha256 (UTIL-2)', () => {
  const v1 = probeCode('1');
  const v2 = probeCode('2');
  const v1Meta = probe();
  const v2Meta = probe({ version: '1.1.0', sha256: sha256Hex(v2) });

  it('compiles the same verified provider code once, and builds a new instance per call', async () => {
    const manager = new ProviderManager(emptyRegistry);

    const first = await manager.executeProviderCode(v1, v1Meta);
    const second = await manager.executeProviderCode(v1, v1Meta, { baseUrl: 'https://mirror.test' });

    expect(runsOf('probe')).toBe(1);
    expect(second).not.toBe(first);
    expect((second as any).baseUrl).toBe('https://mirror.test');
  });

  it('runs the new provider code when the sha256 changes', async () => {
    const manager = new ProviderManager(emptyRegistry);

    expect(await manager.executeProviderCode(v1, v1Meta)).toMatchObject({ version: '1' });
    expect(await manager.executeProviderCode(v2, v2Meta)).toMatchObject({ version: '2' });
    expect(runsOf('probe')).toBe(2);
  });

  it('runs the new extractor code when the sha256 changes', async () => {
    const manager = new ExtractorManager(emptyRegistry);
    const v2Code = megaCloudCode('2');

    const first = await manager.executeExtractorCode(megaCloudCode('1'), megaCloud());
    const again = await manager.executeExtractorCode(megaCloudCode('1'), megaCloud());
    const updated = await manager.executeExtractorCode(v2Code, megaCloud({ version: '1.1.0', sha256: sha256Hex(v2Code) }));

    await expect(first.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'registry 1' }] });
    await expect(updated.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'registry 2' }] });
    expect(again).not.toBe(first);
    expect(runsOf('megacloud')).toBe(2);
  });

  it('still rejects tampered code that claims a hash it verified before', async () => {
    const manager = new ProviderManager(emptyRegistry);
    await manager.executeProviderCode(v1, v1Meta);

    const error = await rejectionOf(manager.executeProviderCode(v2, v1Meta));
    expect(error).toBeInstanceOf(IntegrityError);
    expect((error as IntegrityError).code).toBe('INTEGRITY_MISMATCH');
    expect(runsOf('probe')).toBe(1);
  });

  it('never reuses code that ran with skipIntegrity for a verified call', async () => {
    const manager = new ProviderManager(emptyRegistry);
    const unverified = probe({ sha256: 'f'.repeat(64) });
    await manager.executeProviderCode(v1, unverified, { skipIntegrity: true });

    const error = await rejectionOf(manager.executeProviderCode(v1, unverified));
    expect((error as IntegrityError).code).toBe('INTEGRITY_MISMATCH');
  });
});

describe('invalidate (UTIL-2)', () => {
  it('makes the next provider load fetch and run the code again, for every base URL', async () => {
    const manager = new ProviderManager(fullRegistry());
    const first = await manager.loadExtension('probe');
    const mirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.test' });

    manager.invalidate('Probe');

    const reloaded = await manager.loadExtension('probe');
    const remirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.test' });
    expect(reloaded).not.toBe(first);
    expect(remirrored).not.toBe(mirrored);
    expect(fetchesOf(fetch, PROVIDER_URL)).toBe(4);
    expect(runsOf('probe')).toBe(2);
  });

  it('makes the next extractor load fetch again, by any of its server names', async () => {
    const manager = new ExtractorManager(registryOf([], [megaCloud()]));
    const first = await manager.loadExtractor('megacloud-hd-1');

    manager.invalidate('upcloud');

    expect(await manager.loadExtractor('MegaCloud')).not.toBe(first);
    expect(fetchesOf(fetch, EXTRACTOR_URL)).toBe(2);
    expect(runsOf('megacloud')).toBe(2);
  });

  it('ignores ids that were never loaded', () => {
    expect(() => new ProviderManager(fullRegistry()).invalidate('nothing')).not.toThrow();
    expect(() => new ExtractorManager(fullRegistry()).invalidate('nothing')).not.toThrow();
  });
});

describe('bundled extractor fallback (UTIL-2)', () => {
  /** Makes the bundled MegaCloud resolve `bundled`, and returns its extract mock. */
  const bundledMegaCloud = () => {
    const extract = jest.fn(async () => ({ sources: [{ url: 'bundled' }] }));
    jest.spyOn(defaultExtractors, 'MegaCloud').mockImplementation(() => ({ extract }));
    return extract;
  };

  it.each(registry.extractors.map((entry) => entry.name))('has a bundled %s for registries without it', async (name) => {
    const extractor = await new ExtractorManager(emptyRegistry).loadExtractor(name);

    expect(typeof extractor.extract).toBe('function');
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds a bundled extractor the registry lacks with the manager's context", async () => {
    const appAxios = axios.create();
    const kwik = jest.spyOn(defaultExtractors, 'Kwik');
    const manager = new ExtractorManager(emptyRegistry, { axios: appAxios });

    const extractor = await manager.loadExtractor('kwik-pahe');

    expect(kwik).toHaveBeenCalledTimes(1);
    expect(kwik.mock.calls[0]![0].axios).toBe(appAxios);
    expect(await manager.loadExtractor('Kwik')).toBe(extractor);
  });

  it('falls back to the bundled extractor of the base name when the registry code fails its hash', async () => {
    const extract = bundledMegaCloud();
    const manager = new ExtractorManager(registryOf([], [megaCloud({ sha256: '0'.repeat(64) })]));

    const extractor = await manager.loadExtractor('megacloud-hd-1');

    await expect(extractor.extract(undefined as any)).resolves.toEqual({ sources: [{ url: 'bundled' }] });
    expect(extract).toHaveBeenCalledTimes(1);
    expect(runsOf('megacloud')).toBe(0);
  });

  it('keeps providers on the bundled extractor when the registry version needs a newer context', async () => {
    bundledMegaCloud();
    const calling = probeCode('1', 'play: (url) => ctx.extractors.MegaCloud().extract(url),');
    fetch.mockImplementation(async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => calling }));
    const manager = new ProviderManager(
      registryOf([probe({ sha256: sha256Hex(calling) })], [megaCloud({ minContextVersion: CONTEXT_VERSION + 1 })])
    );

    const provider: any = await manager.loadExtension('probe');

    await expect(provider.play('https://megacloud.test/e/1')).resolves.toEqual({ sources: [{ url: 'bundled' }] });
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([PROVIDER_URL]);
    expect(runsOf('megacloud')).toBe(0);
  });
});

describe('factory lookup (UTIL-2)', () => {
  const provider = (version: string) =>
    `(ctx, baseUrl) => ({ name: 'Probe', version: '${version}', search() {}, fetchAnimeInfo() {}, ` +
    'fetchEpisodeSources() {}, fetchEpisodeServers() {} })';
  const run = (code: string) =>
    new ProviderManager(emptyRegistry).executeProviderCode(code, probe({ sha256: sha256Hex(code) }));

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

  it('prefers the declared factory over an export that points at another one', async () => {
    // What Hermes did to esbuild's export getters: exports.createProbe returned another factory.
    const code = `
      var createProbe = ${provider('declared')};
      var createOther = ${provider('other')};
      exports.createProbe = createOther;
    `;
    await expect(run(code)).resolves.toMatchObject({ version: 'declared' });
  });

  it('finds an extractor that is only the default export', async () => {
    const code = `exports.default = (ctx) => ({ extract: async () => 'default' });`;
    const extractor = await new ExtractorManager(emptyRegistry).executeExtractorCode(code, {
      name: 'Probe',
      version: '1.0.0',
      main: 'https://registry.test/probe.js',
      sha256: sha256Hex(code),
    });

    await expect(extractor.extract(undefined as any)).resolves.toBe('default');
  });
});
