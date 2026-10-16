import Anilist from '../../src/providers/meta/anilist';
import { AniKoto } from '../../src/providers/anime/anikoto/anikoto';
import { metaHttp } from '../../src/utils/meta-http';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { sha256Hex } from '../../src/utils/extension-integrity';

const ANILIST_ID = '162670';

const media = {
  idMal: 55644,
  title: { romaji: 'Dr. Stone: New World Part 2', english: 'Dr. Stone: New World Part 2' },
  status: 'FINISHED',
  season: 'FALL',
  episodes: 3,
  startDate: { year: 2023 },
  coverImage: { extraLarge: 'https://img.example/cover.jpg' },
};

const providerEpisodes = () => [
  { id: 'ep-1', number: 1, title: 'Episode 1' },
  { id: 'ep-2', number: 2, title: 'Episode 2' },
  { id: 'ep-3', number: 3, title: 'Episode 3' },
];

const timeoutError = () => Object.assign(new Error('timeout of 5000ms exceeded'), { code: 'ECONNABORTED' });

// A provider that passes `instanceof AniKoto` (the ani.zip merge path) without any network access.
const fakeAniKoto = () => {
  const provider: any = Object.create(AniKoto.prototype);
  provider.search = jest.fn().mockResolvedValue({ results: [{ id: 'dr-stone', title: media.title.romaji }] });
  provider.fetchAnimeInfo = jest.fn().mockResolvedValue({ episodes: providerEpisodes() });
  return provider;
};

const stubAniList = () => jest.spyOn(metaHttp, 'post').mockResolvedValue({ data: { data: { Media: media } } } as any);

afterEach(() => jest.restoreAllMocks());

describe('Anilist.fetchEpisodesListById (META-4)', () => {
  it('returns provider episodes with a uniqueId when ani.zip and the filler list time out', async () => {
    stubAniList();
    jest.spyOn(metaHttp, 'get').mockRejectedValue(timeoutError());
    const provider = fakeAniKoto();

    const episodes = await new Anilist(provider).fetchEpisodesListById(ANILIST_ID, true);

    expect(episodes.map((e) => [e.id, e.uniqueId])).toEqual([
      ['ep-1', `${ANILIST_ID}$ep=1`],
      ['ep-2', `${ANILIST_ID}$ep=2`],
      ['ep-3', `${ANILIST_ID}$ep=3`],
    ]);
    expect(episodes.every((e) => e.image === media.coverImage.extraLarge)).toBe(true);
    // Provider episodes fetched alongside ani.zip are reused, not fetched again.
    expect(provider.fetchAnimeInfo).toHaveBeenCalledTimes(1);
  });

  it('gives a uniqueId to episodes ani.zip does not match, keeping matched keys unchanged', async () => {
    stubAniList();
    jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
      if (url.includes('api.ani.zip')) {
        return {
          data: {
            episodes: {
              '1': { episode: '1', episodeNumber: 1, title: { en: 'Stone Wars Begin' }, image: 'https://img.example/1.jpg' },
            },
          },
        } as any;
      }
      throw timeoutError();
    });

    const episodes = await new Anilist(fakeAniKoto()).fetchEpisodesListById(ANILIST_ID);

    expect(episodes[0]).toEqual(expect.objectContaining({ uniqueId: `${ANILIST_ID}$ep=1`, title: 'Stone Wars Begin' }));
    expect(episodes.slice(1).map((e) => e.uniqueId)).toEqual([`${ANILIST_ID}$ep=2`, `${ANILIST_ID}$ep=3`]);
  });

  it('gives a uniqueId to episodes from providers outside the ani.zip path', async () => {
    stubAniList();
    const get = jest.spyOn(metaHttp, 'get');
    const provider: any = {
      search: jest.fn().mockResolvedValue({ results: [{ id: 'dr-stone', title: media.title.romaji }] }),
      fetchAnimeInfo: jest.fn().mockResolvedValue({ episodes: providerEpisodes() }),
    };

    const episodes = await new Anilist(provider).fetchEpisodesListById(ANILIST_ID);

    expect(episodes.map((e) => e.uniqueId)).toEqual([`${ANILIST_ID}$ep=1`, `${ANILIST_ID}$ep=2`, `${ANILIST_ID}$ep=3`]);
    expect(get).not.toHaveBeenCalled();
  });

  it('merges ani.zip metadata for a registry-only provider that declares aniZipEpisodes (EXT-1)', async () => {
    stubAniList();
    jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
      if (!url.includes('api.ani.zip')) throw timeoutError();
      return {
        data: {
          episodes: {
            '1': { episode: '1', episodeNumber: 1, title: { en: 'Stone Wars Begin' }, image: 'https://img.example/1.jpg' },
            '2': { episode: '2', episodeNumber: 2, title: { en: 'Into the Sea' }, image: 'https://img.example/2.jpg' },
          },
        },
      } as any;
    });

    // No class and no provider-maps entry: exactly what a provider shipped only through the registry looks like.
    const code = `
      function createRegistryOnly(ctx) {
        return {
          name: 'RegistryOnly',
          capabilities: { aniZipEpisodes: true },
          search: async () => ({ results: [{ id: 'dr-stone', title: ${JSON.stringify(media.title.romaji)} }] }),
          fetchAnimeInfo: async () => ({ episodes: [{ id: 'r-1', number: 1 }, { id: 'r-2', number: 2 }] }),
          fetchEpisodeSources: async () => ({ sources: [] }),
          fetchEpisodeServers: async () => [],
        };
      }
      exports.createRegistryOnly = createRegistryOnly;`;
    const provider: any = await new ProviderManager({ extensions: [], extractors: [] } as any).executeProviderCode(
      code,
      'createRegistryOnly',
      { id: 'registryonly', name: 'RegistryOnly', category: 'anime', sha256: sha256Hex(code) } as any
    );

    const episodes = await new Anilist(provider).fetchEpisodesListById(ANILIST_ID);

    expect(episodes.map((e) => [e.id, e.title, e.uniqueId])).toEqual([
      ['r-1', 'Stone Wars Begin', `${ANILIST_ID}$ep=1`],
      ['r-2', 'Into the Sea', `${ANILIST_ID}$ep=2`],
    ]);
  });

  it('follows declared capabilities over the provider class', async () => {
    stubAniList();
    const get = jest.spyOn(metaHttp, 'get');
    const provider = fakeAniKoto();
    provider.capabilities = { aniZipEpisodes: false };

    const episodes = await new Anilist(provider).fetchEpisodesListById(ANILIST_ID);

    expect(get).not.toHaveBeenCalled();
    expect(episodes.map((e) => e.uniqueId)).toEqual([`${ANILIST_ID}$ep=1`, `${ANILIST_ID}$ep=2`, `${ANILIST_ID}$ep=3`]);
  });

  it('still fails when the provider itself fails', async () => {
    stubAniList();
    jest.spyOn(metaHttp, 'get').mockRejectedValue(timeoutError());
    const provider = fakeAniKoto();
    provider.fetchAnimeInfo.mockRejectedValue(new Error('provider down'));

    await expect(new Anilist(provider).fetchEpisodesListById(ANILIST_ID)).rejects.toThrow('provider down');
  });
});
