import { ProviderManager } from '../../src/utils/ProviderManager';
import type { ProviderType } from '../../src/models/extension-manifest';
import { extensionEntry, registryOf, serveFiles, type FetchSpy } from './helpers/registry';

// The methods a registry provider of each category must have (the table in docs/extension-integration.md).
const REQUIRED: Record<ProviderType, string[]> = {
  'anime': ['search', 'fetchAnimeInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'movies': ['search', 'fetchMediaInfo', 'fetchEpisodeSources', 'fetchEpisodeServers'],
  'manga': ['search', 'fetchMangaInfo', 'fetchChapterPages'],
  'light-novels': ['search', 'fetchLightNovelInfo', 'fetchChapterContent'],
  'meta': ['search', 'fetchEpisodeSources', 'fetchEpisodeServers'],
};

// A provider factory with exactly the given methods; each returns the method's name.
const providerWith = (methods: readonly string[]) => `
function createProbe(ctx) {
  return {
    name: 'Probe',
    ${methods.map((method) => `${method}: async () => '${method}',`).join('\n    ')}
  };
}`;

const codeById: Record<string, string> = {
  mangaprobe: providerWith(REQUIRED.manga),
  novelprobe: providerWith(REQUIRED['light-novels']),
  animeprobe: providerWith(REQUIRED.anime),
};
const registry = registryOf([
  extensionEntry(codeById.mangaprobe!, { id: 'mangaprobe', category: 'manga' }),
  extensionEntry(codeById.novelprobe!, { id: 'novelprobe', category: 'light-novels' }),
  extensionEntry(codeById.animeprobe!, { id: 'animeprobe', category: 'anime' }),
]);

let fetch: FetchSpy;
beforeEach(() => {
  fetch = serveFiles((url) => codeById[url.split('/').at(-2)!]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

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
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('required methods by category (EXT-7)', () => {
  const run = (code: string, category: ProviderType) =>
    new ProviderManager(registryOf()).executeProviderCode(code, extensionEntry(code, { category }));

  it.each(Object.entries(REQUIRED))('accepts %s providers with exactly their required methods', async (category, methods) => {
    await expect(run(providerWith(methods), category as ProviderType)).resolves.toMatchObject({ name: 'Probe' });
  });

  it.each(
    Object.entries(REQUIRED).flatMap(([category, methods]) =>
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
    await expect(run(codeById.animeprobe!, 'music' as ProviderType)).rejects.toThrow(
      "Unknown provider category 'music'"
    );
  });
});
