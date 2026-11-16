import Anilist from '../../src/providers/meta/anilist';
import { MetaError } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';
import soloLeveling from './fixtures/anilist/manga-105398.json';
import { copy, replayAlways } from './fixtures/anilist/replay';

// AniList 105398: romaji "Na Honjaman Level Up", English "Solo Leveling", MAL 121496.
const MALSYNC_URL = 'https://api.malsync.moe/mal/manga/121496';
const chapters = [{ id: 'ch-1', title: 'Chapter 1', chapterNumber: 1 }];

/** A manga provider named `name` whose search finds nothing. */
const provider = (name: string) =>
  ({
    name,
    search: jest.fn().mockResolvedValue({ results: [] }),
    fetchMangaInfo: jest.fn().mockResolvedValue({ id: 'mapped', chapters }),
    fetchChapterPages: jest.fn(),
  }) as any;

// The shape MALSync answered with for MAL 121496 on 2026-11-16, trimmed to two sites.
const malSync = {
  id: 121496,
  type: 'manga',
  Sites: {
    Mangadex: {
      '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0': {
        identifier: '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
        page: 'Mangadex',
        url: 'https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0',
      },
    },
    MangaNato: {
      'solo-leveling': {
        identifier: 'solo-leveling',
        page: 'MangaNato',
        url: 'https://www.manganato.gg/manga/solo-leveling',
      },
    },
  },
};

const serveAniList = (media: unknown = soloLeveling) =>
  replayAlways(jest.spyOn(metaHttp, 'post') as any, media as any);

afterEach(() => jest.restoreAllMocks());

describe('Anilist.Manga MALSync mapping', () => {
  it.each([
    ['MangaDex', '32d76d19-8a05-4db0-9fc2-e0b0648fe9d0'],
    ['MangaKakalot', 'solo-leveling'],
  ])("opens %s's MALSync id without searching", async (name, id) => {
    serveAniList();
    const get = jest.spyOn(metaHttp, 'get').mockResolvedValue({ status: 200, data: malSync } as any);
    const manga = provider(name);

    const info = await new Anilist.Manga(manga).fetchMangaInfo('105398');

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(MALSYNC_URL, expect.anything());
    expect(manga.search).not.toHaveBeenCalled();
    expect(manga.fetchMangaInfo).toHaveBeenCalledWith(id);
    expect(info.chapters).toEqual(chapters);
  });

  it.each([
    ['answers 404', Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } })],
    ['is unreachable', new Error('socket hang up')],
  ])('searches both titles, asking MALSync once, when MALSync %s', async (_case, failure) => {
    serveAniList();
    const get = jest.spyOn(metaHttp, 'get').mockRejectedValue(failure);
    const manga = provider('MangaDex');

    const info = await new Anilist.Manga(manga).fetchMangaInfo('105398');

    expect(get).toHaveBeenCalledTimes(1);
    expect(manga.search.mock.calls).toEqual([['na honjaman level up'], ['solo leveling']]);
    expect(info.chapters).toEqual([]);
  });

  it('does not ask MALSync for a provider it does not list', async () => {
    serveAniList();
    const get = jest.spyOn(metaHttp, 'get');
    const manga = provider('MangaPill');

    await new Anilist.Manga(manga).fetchMangaInfo('105398');

    expect(get).not.toHaveBeenCalled();
    expect(manga.search).toHaveBeenCalledTimes(2);
  });
});

describe('Anilist.Manga details', () => {
  it('gives the chapter and volume counts, as search does', async () => {
    const media = copy(soloLeveling);
    Object.assign(media.body.data.Media, { chapters: 201, volumes: 14 });
    serveAniList(media);
    jest.spyOn(metaHttp, 'get').mockRejectedValue(new Error('offline'));

    const info = await new Anilist.Manga(provider('FakeManga')).fetchMangaInfo('105398');

    expect(info).toEqual(expect.objectContaining({ totalChapters: 201, volumes: 14 }));
  });
});

describe('Anilist.fetchRandomAnime', () => {
  it('reports a failing id list as a GitHub MetaError', async () => {
    const failure = Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } });
    jest.spyOn(metaHttp, 'get').mockRejectedValue(failure);

    const error = await new Anilist({ name: 'Fake' } as any).fetchRandomAnime().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toMatchObject({ source: 'github', status: 503, cause: failure });
  });
});
