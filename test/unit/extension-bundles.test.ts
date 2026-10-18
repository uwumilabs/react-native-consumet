import fs from 'fs';
import path from 'path';
import { parseSync, traverse } from '@babel/core';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';
import { TvType, WatchListType, MediaStatus, SubOrDub } from '../../src/models';

const repoRoot = path.join(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const RELATIVE_REQUIRE = /\brequire\(\s*["']\.\.?\//;

const entries = [
  ...registry.extensions.map((e) => ({ label: `extension ${e.id}`, distFile: e.distFile, name: e.factoryName })),
  ...registry.extractors.map((e) => ({ label: `extractor ${e.name}`, distFile: e.distFile, name: e.name })),
];

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('registry entries are single-file bundles (EXT-5)', () => {
  it.each(entries)('$label has no relative require', ({ distFile }) => {
    expect(distFile).toMatch(/^dist\/bundles\//);
    expect(read(distFile)).not.toMatch(RELATIVE_REQUIRE);
  });

  it.each(registry.extensions)('extension $id runs through executeProviderCode', async (entry) => {
    const provider: any = await new ProviderManager(registry as any).executeProviderCode(
      read(entry.distFile),
      entry.factoryName,
      entry as any
    );
    expect(typeof provider.search).toBe('function');
  });

  it.each(registry.extractors)('extractor $name runs through executeExtractorCode', async (entry) => {
    const extractor = await new ExtractorManager(registry as any).executeExtractorCode(read(entry.distFile), entry);
    expect(typeof extractor.extract).toBe('function');
  });

  it.each(entries)('$label is found by loaders that read factories from exports', ({ distFile, name }) => {
    // How loaders before EXT-5 resolved a factory, without relying on block function hoisting.
    const exports: Record<string, unknown> = {};
    const run = new Function('exports', 'module', 'require', read(distFile));
    run(exports, { exports: {} }, () => ({}));
    expect(typeof exports[name]).toBe('function');
  });

  it('inlines Gofile into HubCloud instead of requiring it', () => {
    const hubcloud = read(registry.extractors.find((e) => e.name === 'HubCloud')!.distFile);
    expect(hubcloud).toMatch(/^function Gofile\(/m);
    expect(hubcloud).not.toMatch(/require\(["'][^"']*gofile/);
  });
});

describe('extension runtime require (EXT-5)', () => {
  const extractorRequiring = (specifier: string) => `
    const mod = require(${JSON.stringify(specifier)});
    function Probe(ctx) { return { serverName: 'probe', sources: [], extract: async () => mod }; }
  `;
  const probe = { name: 'Probe', version: '1.0.0', main: 'https://registry.test/probe.js' };

  it('throws for a module the runtime does not provide', async () => {
    const manager = new ExtractorManager(registry as any);
    await expect(
      manager.executeExtractorCode(extractorRequiring('./gofile'), probe, { skipIntegrity: true })
    ).rejects.toThrow("Extension 'Probe' requires './gofile'");
  });

  it.each(['react-native-consumet/models', '../../../models', '../../models/index.js'])(
    'gives %s the real enums',
    async (specifier) => {
      const extractor = await new ExtractorManager(registry as any).executeExtractorCode(
        extractorRequiring(specifier),
        probe,
        { skipIntegrity: true }
      );
      const models: any = await extractor.extract(undefined as any);

      expect(models.TvType).toBe(TvType);
      expect(models.WatchListType.ONHOLD).toBe(WatchListType.ONHOLD);
      expect(models.MediaStatus).toBe(MediaStatus);
      expect(models.SubOrDub).toBe(SubOrDub);
    }
  );

  it('gives providers the real enums and base parsers', async () => {
    const code = `
      const models = require('react-native-consumet/models');
      function createProbe(ctx) {
        return { models, search() {}, fetchEpisodeSources() {}, fetchEpisodeServers() {}, fetchAnimeInfo() {} };
      }
    `;
    const manager = new ProviderManager(registry as any);
    const provider: any = await manager.executeProviderCode(
      code,
      'createProbe',
      { id: 'probe', category: 'anime' } as any,
      { skipIntegrity: true }
    );

    expect(provider.models.TvType.MOVIE).toBe(TvType.MOVIE);
    expect(provider.models.AnimeParser).toBe(manager.getProviderContext().AnimeParser);
  });
});

describe('registry bundles on Hermes, which compiles runtime code without block scoping', () => {
  it.each(entries)('$label declares no let or const', ({ distFile }) => {
    const ast = parseSync(read(distFile), { babelrc: false, configFile: false, sourceType: 'script' });
    const blockScoped: string[] = [];
    traverse(ast!, {
      VariableDeclaration(p) {
        if (p.node.kind !== 'var') blockScoped.push(`${p.node.kind} at line ${p.node.loc?.start.line}`);
      },
    });
    expect(blockScoped).toEqual([]);
  });

  it('runs each mirror in the shared bundle with its own platform', async () => {
    const manager = new ProviderManager(registry as any);
    for (const id of ['netflixmirror', 'primemirror', 'disneymirror']) {
      const entry = registry.extensions.find((e) => e.id === id)!;
      const provider: any = await manager.executeProviderCode(read(entry.distFile), entry.factoryName, entry as any);
      expect(provider.name).toBe(entry.name);
    }
  });

  it('prefers the declared factory over an export that points at another one', async () => {
    // What Hermes did to esbuild's export getters: exports.createProbe returned another factory.
    const methods = 'search() {}, fetchEpisodeSources() {}, fetchEpisodeServers() {}, fetchAnimeInfo() {}';
    const code = `
      function createProbe(ctx) { return { which: 'declared', ${methods} }; }
      function createOther(ctx) { return { which: 'other', ${methods} }; }
      exports.createProbe = createOther;
    `;
    const provider: any = await new ProviderManager(registry as any).executeProviderCode(
      code,
      'createProbe',
      { id: 'probe', category: 'anime' } as any,
      { skipIntegrity: true }
    );
    expect(provider.which).toBe('declared');
  });
});
