import Anilist from '../../src/providers/meta/anilist';
import { MetaError } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';
import soloLeveling from './fixtures/anilist/manga-105398.json';
import { response } from './fixtures/anilist/replay';

// AniList 105398: romaji "Na Honjaman Level Up", English "Solo Leveling", MAL 121496.
const MALSYNC_URL = 'https://api.malsync.moe/mal/manga/121496';
const chapters = () => [{ id: 'ch-3' }, { id: 'ch-2' }, { id: 'ch-1' }];

/** A manga provider that knows the manga under `knownAs` (its search slug) only. */
const fakeMangaProvider = (knownAs?: string) =>
  ({
    name: 'FakeManga',
    search: jest.fn(async (slug: string) => ({
      results: slug === knownAs ? [{ id: 'solo-leveling', title: 'Solo Leveling' }] : [],
    })),
    fetchMangaInfo: jest.fn().mockResolvedValue({ id: 'solo-leveling', chapters: chapters() }),
    fetchChapterPages: jest.fn(),
  }) as any;

/** AniList answers with the recorded manga; MALSync answers `malSync`. */
const serve = (malSync: { status: number; data?: unknown } = { status: 404 }) => {
  jest.spyOn(metaHttp, 'post').mockResolvedValue(response(soloLeveling) as any);
  return jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
    if (url !== MALSYNC_URL) throw new Error(`unexpected request ${url}`);
    return { data: {}, ...malSync } as any;
  });
};

afterEach(() => jest.restoreAllMocks());

describe('Anilist.Manga.fetchMangaInfo chapters (META-12)', () => {
  it('waits for the romaji lookup and tries the English title when it finds nothing', async () => {
    serve();
    const provider = fakeMangaProvider('solo leveling');

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.search.mock.calls).toEqual([['na honjaman level up'], ['solo leveling']]);
    expect(provider.fetchMangaInfo).toHaveBeenCalledWith('solo-leveling');
    expect(info.chapters).toEqual([{ id: 'ch-1' }, { id: 'ch-2' }, { id: 'ch-3' }]);
  });

  it('stops at the romaji title when the provider has the manga under it', async () => {
    serve();
    const provider = fakeMangaProvider('na honjaman level up');

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.search.mock.calls).toEqual([['na honjaman level up']]);
    expect(info.chapters).toHaveLength(3);
  });

  it('returns the AniList info with no chapters when the provider has neither title', async () => {
    serve();
    const provider = fakeMangaProvider();

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.search).toHaveBeenCalledTimes(2);
    expect(provider.fetchMangaInfo).not.toHaveBeenCalled();
    expect(info).toEqual(expect.objectContaining({ id: '105398', malId: 121496, chapters: [] }));
    expect(info.title).toEqual(expect.objectContaining({ english: 'Solo Leveling' }));
  });

  it('copes with a provider search that returns no result list', async () => {
    serve();
    const provider = fakeMangaProvider();
    provider.search.mockResolvedValue(undefined);

    await expect(new Anilist.Manga(provider).fetchMangaInfo('105398')).resolves.toEqual(
      expect.objectContaining({ chapters: [] })
    );
  });

  it('uses the MALSync mapping for the provider before searching', async () => {
    const get = serve({
      status: 200,
      data: { Sites: { FakeManga: { 'solo-leveling': { page: 'FakeManga', url: 'https://fake/manga/solo-leveling' } } } },
    });
    const provider = fakeMangaProvider();

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(get).toHaveBeenCalledWith(MALSYNC_URL, expect.anything());
    expect(provider.search).not.toHaveBeenCalled();
    expect(provider.fetchMangaInfo).toHaveBeenCalledWith('solo-leveling');
    expect(info.chapters).toHaveLength(3);
  });

  it('reports a failing provider as a provider MetaError', async () => {
    serve();
    const provider = fakeMangaProvider('na honjaman level up');
    const failure = new Error('provider down');
    provider.fetchMangaInfo.mockRejectedValue(failure);

    const error = await new Anilist.Manga(provider).fetchMangaInfo('105398').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toMatchObject({ source: 'provider', cause: failure });
  });
});
