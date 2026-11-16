import Anilist from '../../src/providers/meta/anilist';
import { MetaError } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';
import soloLeveling from './fixtures/anilist/manga-105398.json';
import { replayAlways } from './fixtures/anilist/replay';
import { fakeMangaProvider as fakeProvider } from './helpers/fake-providers';

// AniList 105398: romaji "Na Honjaman Level Up", English "Solo Leveling", MAL 121496.
const MALSYNC_URL = 'https://api.malsync.moe/mal/manga/121496';
// In reading order, as every manga provider returns them.
const chapters = () => [1, 2, 3].map((n) => ({ id: `ch-${n}`, title: `Chapter ${n}`, chapterNumber: n }));

/** A manga provider that knows the manga under `knownAs` (its search slug) only. */
const fakeMangaProvider = (knownAs?: string) =>
  fakeProvider({
    search: jest.fn(async (slug: string) => ({
      results: slug === knownAs ? [{ id: 'solo-leveling', title: 'Solo Leveling' }] : [],
    })),
    info: { id: 'solo-leveling', chapters: chapters() },
  }) as any;

/** AniList answers with the recorded manga; MALSync answers `malSync`. */
const serve = (malSync: { status: number; data?: unknown } = { status: 404 }) => {
  replayAlways(jest.spyOn(metaHttp, 'post'), soloLeveling);
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
    expect(info.chapters!.map((c) => c.id)).toEqual(['ch-1', 'ch-2', 'ch-3']);
  });

  it('stops at the romaji title when the provider has the manga under it', async () => {
    serve();
    const provider = fakeMangaProvider('na honjaman level up');

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.search.mock.calls).toEqual([['na honjaman level up']]);
    expect(info.chapters).toHaveLength(3);
  });

  it('matches a result by its alt titles when the provider shows the English title', async () => {
    serve();
    const provider = fakeMangaProvider();
    provider.search.mockResolvedValue({
      results: [
        { id: 'solo-leveling-ragnarok', title: 'Solo Leveling: Ragnarok' },
        { id: 'solo-leveling', title: 'Solo Leveling', altTitles: ['Na Honjaman Level Up', '나 혼자만 레벨업'] },
      ],
    });

    await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.search.mock.calls).toEqual([['na honjaman level up']]);
    expect(provider.fetchMangaInfo).toHaveBeenCalledWith('solo-leveling');
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
    // The shape MALSync answered with for MAL 121496 on 2026-11-16, trimmed to one site.
    const get = serve({
      status: 200,
      data: {
        Sites: {
          Mangadex: {
            'solo-leveling': {
              identifier: 'solo-leveling',
              page: 'Mangadex',
              url: 'https://mangadex.org/title/solo-leveling',
            },
          },
        },
      },
    });
    const provider = { ...fakeMangaProvider(), name: 'MangaDex' };

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(get).toHaveBeenCalledWith(MALSYNC_URL, expect.anything());
    expect(provider.search).not.toHaveBeenCalled();
    expect(provider.fetchMangaInfo).toHaveBeenCalledWith('solo-leveling');
    expect(info.chapters).toHaveLength(3);
  });

  it("keeps the provider's chapter order", async () => {
    serve();
    // MangaDex lists titles whose chapter numbers restart each volume in its feed order, which
    // sorting by chapter number would scramble.
    const restarting = [
      { id: 'v1c1', title: 'Chapter 1', chapterNumber: 1 },
      { id: 'v1c2', title: 'Chapter 2', chapterNumber: 2 },
      { id: 'v2c1', title: 'Chapter 1', chapterNumber: 1, volumeNumber: 2 },
    ];
    const provider = fakeMangaProvider('na honjaman level up');
    provider.fetchMangaInfo.mockResolvedValue({ id: 'solo-leveling', chapters: restarting });

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(info.chapters!.map((c) => c.id)).toEqual(['v1c1', 'v1c2', 'v2c1']);
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
