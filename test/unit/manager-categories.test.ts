import { ProviderManager, REQUIRED_PROVIDER_METHODS } from '../../src/utils/ProviderManager';
import { sha256Hex } from '../../src/utils/extension-integrity';
import type { ProviderType } from '../../src/models/extension-manifest';

// A provider factory with exactly the given methods; each returns the method's name.
const providerWith = (methods: readonly string[]) => `
function createProbe(ctx) {
  return {
    name: 'Probe',
    ${methods.map((method) => `${method}: async () => '${method}',`).join('\n    ')}
  };
}`;

const entry = (id: string, category: ProviderType, code: string) =>
  ({
    id,
    name: id,
    description: 'Test provider',
    version: '1.0.0',
    author: { name: 'Tests' },
    category,
    main: `https://registry.test/registry/extensions/${id}/1.0.0.js`,
    factoryName: 'createProbe',
    sha256: sha256Hex(code),
    baseUrl: `https://${id}.test`,
    logo: '',
    status: 'beta',
    lastUpdated: '2026-10-16T00:00:00Z',
    extractors: [],
  }) as any;

const mangaCode = providerWith(['search', 'fetchMangaInfo', 'fetchChapterPages']);
const novelCode = providerWith(['search', 'fetchLightNovelInfo', 'fetchChapterContent']);
const animeCode = providerWith(REQUIRED_PROVIDER_METHODS.anime);
const codeById: Record<string, string> = { mangaprobe: mangaCode, novelprobe: novelCode, animeprobe: animeCode };
const registry = {
  extensions: [
    entry('mangaprobe', 'manga', mangaCode),
    entry('novelprobe', 'light-novels', novelCode),
    entry('animeprobe', 'anime', animeCode),
  ],
  extractors: [],
} as any;

const realFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn(async (url: any) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => codeById[String(url).split('/').at(-2)!],
  }));
  global.fetch = fetchMock as any;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('getProvider(category, id) (EXT-7)', () => {
  it('loads a manga provider, which has no episode methods', async () => {
    const manga = await new ProviderManager(registry).getProvider('manga', 'mangaprobe');

    await expect(manga.fetchMangaInfo('one-piece')).resolves.toBe('fetchMangaInfo');
    await expect(manga.fetchChapterPages('one-piece-1')).resolves.toBe('fetchChapterPages');
  });

  it('loads a light-novel provider', async () => {
    const novel = await new ProviderManager(registry).getProvider('light-novels', 'novelprobe');

    await expect(novel.fetchChapterContent('chapter-1')).resolves.toBe('fetchChapterContent');
  });

  it('shares the loaded provider with getAnimeProvider and loadExtension', async () => {
    const manager = new ProviderManager(registry);

    const anime = await manager.getProvider('anime', 'animeprobe');

    expect(await manager.getAnimeProvider('animeprobe')).toBe(anime);
    expect(await manager.loadExtension('animeprobe')).toBe(anime);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses an extension of another category without loading it', async () => {
    const manager = new ProviderManager(registry);

    await expect(manager.getProvider('manga', 'animeprobe')).rejects.toThrow(
      "Extension 'animeprobe' is not a manga provider"
    );
    await expect(manager.getAnimeProvider('mangaprobe')).rejects.toThrow(
      "Extension 'mangaprobe' is not an anime provider"
    );
    await expect(manager.getMovieProvider('novelprobe')).rejects.toThrow(
      "Extension 'novelprobe' is not a movie provider"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('required methods by category (EXT-7)', () => {
  const run = (code: string, category: ProviderType) =>
    new ProviderManager({ extensions: [], extractors: [] } as any).executeProviderCode(
      code,
      'createProbe',
      entry('probe', category, code)
    );

  it.each(Object.entries(REQUIRED_PROVIDER_METHODS))(
    'accepts %s providers with exactly their required methods',
    async (category, methods) => {
      await expect(run(providerWith(methods), category as ProviderType)).resolves.toMatchObject({ name: 'Probe' });
    }
  );

  it.each(
    Object.entries(REQUIRED_PROVIDER_METHODS).flatMap(([category, methods]) =>
      methods.map((method) => [category, method, methods.filter((m) => m !== method)] as const)
    )
  )('rejects %s providers without %s', async (category, method, others) => {
    await expect(run(providerWith(others), category as ProviderType)).rejects.toThrow(
      `Provider is missing required ${category} method: ${method}`
    );
  });

  it('lists every missing method', async () => {
    await expect(run(providerWith(['search']), 'manga')).rejects.toThrow(
      'Provider is missing required manga methods: fetchMangaInfo, fetchChapterPages'
    );
  });

  it('rejects an entry whose category it does not know', async () => {
    await expect(run(animeCode, 'music' as ProviderType)).rejects.toThrow("Unknown provider category 'music'");
  });
});
