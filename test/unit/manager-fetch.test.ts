import http from 'http';
import type { AddressInfo } from 'net';
import axios, { type AxiosInstance } from 'axios';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { sha256Hex } from '../../src/utils/extension-integrity';

// The `fetch` extension code runs with, read back through a provider and an extractor.
const report = `async (url) => {
  const res = await fetch(url);
  return { ok: res.ok, status: res.status, statusText: res.statusText, text: await res.text() };
}`;
const parse = `async (url) => (await fetch(url)).json()`;

const providerCode = `
function createFetchProbe(ctx) {
  return {
    name: 'FetchProbe',
    search: async () => ({ results: [] }),
    fetchAnimeInfo: async () => ({}),
    fetchEpisodeSources: async () => ({ sources: [] }),
    fetchEpisodeServers: async () => [],
    report: ${report},
    parse: ${parse},
  };
}`;
const extractorCode = `
function FetchProbe(ctx) {
  return { serverName: 'FetchProbe', sources: [], extract: ${report}, parse: ${parse} };
}`;

const emptyRegistry = { extensions: [], extractors: [] } as any;

type Probe = { report(url: string): Promise<any>; parse(url: string): Promise<any> };

const viaProvider = async (client: AxiosInstance): Promise<Probe> =>
  (await new ProviderManager(emptyRegistry, { axios: client }).executeProviderCode(
    providerCode,
    'createFetchProbe',
    { id: 'fetchprobe', category: 'anime', sha256: sha256Hex(providerCode) } as any
  )) as any;

const viaExtractor = async (client: AxiosInstance): Promise<Probe> => {
  const extractor: any = await new ExtractorManager(emptyRegistry, { axios: client }).executeExtractorCode(
    extractorCode,
    { name: 'FetchProbe', version: '1.0.0', main: 'https://registry.test/fetchprobe.js', sha256: sha256Hex(extractorCode) }
  );
  return { report: extractor.extract, parse: extractor.parse };
};

const routes: Record<string, [status: number, type: string, body: string]> = {
  '/page': [200, 'text/html', '<p>hi</p>'],
  '/json': [200, 'application/json', '{"a":1}'],
  '/missing': [404, 'text/plain', 'not here'],
  '/broken': [500, 'application/json', '{"error":"boom"}'],
};

let server: http.Server;
let base: string;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const [status, type, body] = routes[req.url ?? ''] ?? [404, 'text/plain', ''];
    res.writeHead(status, { 'Content-Type': type });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

// `proxy: false` keeps proxy environment variables from routing the local server elsewhere.
const localAxios = () => axios.create({ proxy: false });

describe.each([
  ['provider', viaProvider],
  ['extractor', viaExtractor],
])('extension fetch in %s code (UTIL-2)', (_kind, probeWith) => {
  it('resolves an HTTP error with ok: false instead of throwing', async () => {
    const probe = await probeWith(localAxios());

    await expect(probe.report(`${base}/missing`)).resolves.toEqual({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: 'not here',
    });
    await expect(probe.report(`${base}/broken`)).resolves.toMatchObject({ ok: false, status: 500 });
  });

  it('returns the body as text, also for JSON responses, and parses it with json()', async () => {
    const probe = await probeWith(localAxios());

    await expect(probe.report(`${base}/page`)).resolves.toMatchObject({ ok: true, text: '<p>hi</p>' });
    await expect(probe.report(`${base}/json`)).resolves.toMatchObject({ ok: true, text: '{"a":1}' });
    await expect(probe.report(`${base}/broken`)).resolves.toMatchObject({ text: '{"error":"boom"}' });
    await expect(probe.parse(`${base}/json`)).resolves.toEqual({ a: 1 });
  });

  it('reports ok: false when the app axios still rejects HTTP errors, with the body as text', async () => {
    const strict = axios.create({
      adapter: async (config) => {
        const response = { data: { error: 'gone' }, status: 410, statusText: 'Gone', headers: {}, config };
        throw Object.assign(new Error('Request failed with status code 410'), { isAxiosError: true, response });
      },
    });
    const probe = await probeWith(strict);

    await expect(probe.report('https://site.test/x')).resolves.toEqual({
      ok: false,
      status: 410,
      statusText: 'Gone',
      text: '{"error":"gone"}',
    });
  });

  it('rejects only when no response arrives', async () => {
    const offline = axios.create({
      adapter: async () => {
        throw new Error('getaddrinfo ENOTFOUND site.test');
      },
    });
    const probe = await probeWith(offline);

    await expect(probe.report('https://site.test/x')).rejects.toThrow('fetch failed: getaddrinfo ENOTFOUND site.test');
  });
});
