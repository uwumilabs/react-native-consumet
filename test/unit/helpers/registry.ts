import { jest } from '@jest/globals';
import { sha256Hex } from '../../../src/utils/extension-integrity';

/**
 * Registry entries, registry code and a `fetch` that serves it, for tests of the managers. Code is
 * plain JavaScript, run by the managers as registry bundles are.
 */

declare global {
  // eslint-disable-next-line no-var
  var __runs: Record<string, number> | undefined;
}

/** A statement that counts each evaluation of the code it is in under `key` (see runsOf). */
export const countRuns = (key: string) =>
  `globalThis.__runs = globalThis.__runs || {}; globalThis.__runs[${JSON.stringify(key)}] = (globalThis.__runs[${JSON.stringify(key)}] || 0) + 1;`;
/** How often code with countRuns(key) was evaluated since resetRuns. */
export const runsOf = (key: string) => globalThis.__runs?.[key] ?? 0;
export const resetRuns = () => {
  globalThis.__runs = {};
};

/**
 * Code for an anime provider whose factory `createProbe(ctx, baseUrl)` returns the methods anime
 * providers need, plus `members` (object-literal source). `before` runs when the code is evaluated.
 */
export const providerCode = ({ members = '', before = '' }: { members?: string; before?: string } = {}) => `${before}
function createProbe(ctx, baseUrl) {
  return {
    name: 'Probe',
    baseUrl,
    search: async () => ({ results: [] }),
    fetchAnimeInfo: async () => ({}),
    fetchEpisodeSources: async () => ({ sources: [] }),
    fetchEpisodeServers: async () => [],
    ${members}
  };
}
exports.createProbe = createProbe;
`;

/** Code for an extractor factory `name(ctx)` whose `extract` is the given source. */
export const extractorCode = (
  name: string,
  { extract = 'async () => ({ sources: [] })', before = '' }: { extract?: string; before?: string } = {}
) => `${before}
function ${name}(ctx) {
  return { extract: ${extract} };
}
exports.${name} = ${name};
`;

export const extensionUrl = (id: string, version = '1.0.0') =>
  `https://registry.test/registry/extensions/${id}/${version}.js`;
export const extractorUrl = (name: string, version = '1.0.0') =>
  `https://registry.test/registry/extractors/${name.toLowerCase()}/${version}.js`;

/** A registry entry for the provider `code`: anime provider `probe`, unless `overrides` say otherwise. */
export const extensionEntry = (code: string, overrides: Record<string, unknown> = {}): any => {
  const id = (overrides.id as string | undefined) ?? 'probe';
  return {
    id,
    name: 'Probe',
    description: 'Test provider',
    version: '1.0.0',
    author: { name: 'Tests' },
    category: 'anime',
    main: extensionUrl(id),
    factoryName: 'createProbe',
    sha256: sha256Hex(code),
    baseUrl: 'https://probe.test',
    logo: '',
    status: 'beta',
    lastUpdated: '2026-10-16T00:00:00Z',
    extractors: [],
    ...overrides,
  };
};

/** A registry entry for the extractor `name` and its `code`. */
export const extractorEntry = (name: string, code: string, overrides: Record<string, unknown> = {}): any => ({
  name,
  version: '1.0.0',
  main: extractorUrl(name),
  sha256: sha256Hex(code),
  ...overrides,
});

export const registryOf = (extensions: unknown[] = [], extractors: unknown[] = []): any => ({ extensions, extractors });

/** A mock standing in for `fetch`, loosely typed so tests can script any response. */
export type FetchSpy = jest.Mock<(...args: any[]) => any>;

/**
 * Answers every `fetch` with the body `files` has for its URL, 404 for any other, until
 * jest.restoreAllMocks(). Returns the spy.
 */
export const serveFiles = (files: Record<string, string> | ((url: string) => string | undefined)): FetchSpy =>
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = typeof files === 'function' ? files(url) : files[url];
    const response =
      body === undefined
        ? { ok: false, status: 404, statusText: 'Not Found', text: async () => '' }
        : { ok: true, status: 200, statusText: 'OK', text: async () => body };
    return response as Response;
  }) as unknown as FetchSpy;

/** How many times `fetch` was asked for `url`. */
export const fetchesOf = (fetch: FetchSpy, url: string) =>
  fetch.mock.calls.filter(([called]) => String(called) === url).length;
