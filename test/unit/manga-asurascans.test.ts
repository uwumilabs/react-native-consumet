import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { MediaStatus } from '../../src/models';
import { AsuraScans } from '../../src/providers/manga/asurascans';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';

/** A recorded api.asurascans.com response (trimmed; `note` says how), keyed by its request. */
type Fixture = { request: string; recordedAt: string; note: string; status: number; body: any };

const API = 'https://api.asurascans.com/api';
const dir = join(__dirname, 'fixtures/manga/asurascans');
const fixtures: Fixture[] = readdirSync(dir).map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')));
const fixture = (name: string): Fixture => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));
const url = (f: Fixture) => f.request.replace(/^GET /, '');

// The recording time: chapter 149 of Solo Farming In The Tower was still in early access.
const RECORDED_AT = Date.parse('2026-10-30T14:23:21Z');
const UNLOCKED_AT = Date.parse('2026-10-30T17:57:25.223823Z');

/**
 * A provider whose context axios answers each GET with the fixture recorded for that URL (extra
 * routes map other URLs to a fixture). Error statuses reject the way axios does.
 */
const provider = (routes: Record<string, Fixture> = {}) => {
  const byUrl = new Map<string, Fixture>([...fixtures.map((f) => [url(f), f] as const), ...Object.entries(routes)]);
  const get = jest.fn(async (requested: string) => {
    const f = byUrl.get(requested);
    if (!f) throw new Error(`no fixture for ${requested}`);
    if (f.status >= 400)
      throw Object.assign(new Error(`Request failed with status code ${f.status}`), {
        response: { status: f.status, data: f.body },
      });
    return { status: f.status, data: f.body };
  });
  return { asura: new AsuraScans({ ...createProviderContext(), axios: { get } as any }), get };
};
const requested = (get: jest.Mock) => get.mock.calls.map(([requestUrl]) => requestUrl);

beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(RECORDED_AT));
afterEach(() => jest.restoreAllMocks());

describe('AsuraScans search', () => {
  it('follows the contract and maps the API fields', async () => {
    const { asura, get } = provider();

    const search = await asura.search('Omniscient Reader’s Viewpoint');

    expectMangaSearch(search);
    expect(requested(get)).toEqual([`${API}/series?search=Omniscient%20Reader%E2%80%99s%20Viewpoint&limit=20&offset=0`]);
    expect(search).toEqual({
      currentPage: 1,
      hasNextPage: false,
      results: [
        {
          id: 'omniscient-readers-viewpoint',
          title: 'Omniscient Reader’s Viewpoint',
          altTitles: ['Lector omnisciente', 'Punto de vista de lector omnisciente', '全知讀者視角'],
          image: 'https://cdn.asurascans.com/asura-images/covers/omniscient-readers-viewpoint.c29ced.webp',
          url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9',
          description:
            '‘This is a development that I know of.’The moment he thought that the world had been destroyed, a new ' +
            'universe had unfolded.The new life of an ordinary reader begins within the world of the novel, a novel ' +
            'that he alone had finished.',
          status: MediaStatus.HIATUS,
          type: 'manhwa',
          rating: 9.85,
          latestChapter: 311,
        },
      ],
    });
  });

  it('pages by offset and reads has_more', async () => {
    const { asura, get } = provider();

    const search = await asura.search('the', 2);

    expectMangaSearch(search);
    expect(requested(get)).toEqual([`${API}/series?search=the&limit=20&offset=20`]);
    expect(search.currentPage).toBe(2);
    expect(search.hasNextPage).toBe(true);
    expect(search.results.map((r) => [r.id, r.status])).toEqual([
      ['star-embracing-swordmaster', MediaStatus.ONGOING],
      ['the-tale-of-cultivation-and-demon-extermination', MediaStatus.ONGOING],
    ]);
  });

  it('turns the HTML synopsis into plain text, one paragraph per line', async () => {
    const { asura } = provider();

    const { results } = await asura.search('the', 2);

    expect(results[1]!.description).toBe(
      'By Redice Studio that brought you <Myst, Might, Mayhem> and <Nano Machine>, <Reaper of the Drifting ' +
        'Moon>, and many more!]\n' +
        '"My revenge won’t end until every Demon in this world has been wiped out.”\n' +
        'After brutally displaying the head of the Demon that murdered his parents, the boy Yise was shunned by ' +
        'his village as a monster.'
    );
  });

  it('returns no results when the API has none (data: null)', async () => {
    const { asura } = provider();

    expect(await asura.search('zzzzqqqxx')).toEqual({ currentPage: 1, hasNextPage: false, results: [] });
  });
});

describe('AsuraScans fetchMangaInfo', () => {
  it('follows the contract, with chapters first to last', async () => {
    const { asura, get } = provider();

    const info = await asura.fetchMangaInfo('omniscient-readers-viewpoint');

    expectMangaInfo(info);
    expect(requested(get).sort()).toEqual([
      `${API}/series/omniscient-readers-viewpoint`,
      `${API}/series/omniscient-readers-viewpoint/chapters`,
    ]);
    expect(info).toMatchObject({
      id: 'omniscient-readers-viewpoint',
      title: 'Omniscient Reader’s Viewpoint',
      status: MediaStatus.HIATUS,
      genres: ['Action', 'Adventure', 'Fantasy'],
      authors: ['Sing-Shong'],
      artists: ['3B2S'],
    });
    expect(info.chapters).toEqual([
      {
        id: 'omniscient-readers-viewpoint/chapter/0',
        title: 'Prologue',
        chapterNumber: 0,
        releaseDate: '2022-12-21T16:35:42.000Z',
        url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/0',
      },
      {
        id: 'omniscient-readers-viewpoint/chapter/1',
        title: 'Chapter 1',
        chapterNumber: 1,
        releaseDate: '2022-12-21T16:48:51.000Z',
        url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/1',
      },
      {
        id: 'omniscient-readers-viewpoint/chapter/2',
        title: 'Chapter 2',
        chapterNumber: 2,
        releaseDate: '2022-12-21T16:48:54.000Z',
        url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/2',
      },
      {
        id: 'omniscient-readers-viewpoint/chapter/310',
        title: '“Dokja’s Fable” Part - 12',
        chapterNumber: 310,
        releaseDate: '2026-05-13T00:34:16.985Z',
        url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/310',
      },
      {
        id: 'omniscient-readers-viewpoint/chapter/311',
        title: '“Dokja’s Fable” Part -13 {S1 END}',
        chapterNumber: 311,
        releaseDate: '2026-05-19T17:56:55.666Z',
        url: 'https://asurascans.com/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/311',
      },
    ]);
    expect(info.recommendations).toEqual([
      {
        id: 'nano-machine',
        title: 'Nano Machine',
        image: 'https://cdn.asurascans.com/asura-images/covers/nano-machine.e31bdb.webp',
        url: 'https://asurascans.com/comics/nano-machine-3ebcc5a9',
        status: MediaStatus.ONGOING,
        type: 'manhwa',
        rating: 9.27,
      },
      {
        id: 'pick-me-up-infinite-gacha',
        title: 'Pick Me Up, Infinite Gacha',
        image: 'https://cdn.asurascans.com/asura-images/covers/pick-me-up-infinite-gacha.3ebe61.webp',
        url: 'https://asurascans.com/comics/pick-me-up-infinite-gacha-3ebcc5a9',
        status: MediaStatus.ONGOING,
        type: 'manhwa',
        rating: 9.77,
      },
    ]);
  });

  it('accepts asuracomic.net ids and returns the bare slug', async () => {
    // The API redirects an old `<slug>-<hash>` to the series; axios follows the redirect.
    const legacy = `${API}/series/omniscient-readers-viewpoint-b88a351c`;
    const { asura, get } = provider({
      [legacy]: fixture('series-omniscient-readers-viewpoint'),
      [`${legacy}/chapters`]: fixture('chapters-omniscient-readers-viewpoint'),
    });

    const info = await asura.fetchMangaInfo('series/omniscient-readers-viewpoint-b88a351c');

    expect(requested(get).sort()).toEqual([legacy, `${legacy}/chapters`]);
    expect(info.id).toBe('omniscient-readers-viewpoint');
    expect(info.chapters![1]!.id).toBe('omniscient-readers-viewpoint/chapter/1');
  });

  it('keeps decimal chapters in order and leaves out early-access chapters until they unlock', async () => {
    const { asura } = provider();

    const locked = await asura.fetchMangaInfo('solo-farming-in-the-tower');

    expectMangaInfo(locked);
    expect(locked.chapters!.map((c) => c.chapterNumber)).toEqual([1, 2, 100, 100.5, 101, 148]);
    expect(locked.chapters![3]).toMatchObject({
      id: 'solo-farming-in-the-tower/chapter/100.5',
      title: 'Chapter 100.5',
      chapterNumber: 100.5,
    });
    expect(locked.chapters![4]!.title).toBe("The Black Dragon's Representative");

    jest.spyOn(Date, 'now').mockReturnValue(UNLOCKED_AT + 1);
    const unlocked = await asura.fetchMangaInfo('solo-farming-in-the-tower');

    expect(unlocked.chapters!.at(-1)).toMatchObject({
      id: 'solo-farming-in-the-tower/chapter/149',
      title: 'Hide-and-Seek',
      chapterNumber: 149,
      releaseDate: '2026-10-30T11:57:25.223Z',
    });
  });

  it('splits multi-person credits and leaves out empty ones', async () => {
    const detail = fixture('series-omniscient-readers-viewpoint');
    detail.body.series.author = 'hong daeui/ Q10';
    detail.body.series.artist = 'Fit, Geonjin';
    const credited = provider({ [url(detail)]: detail });
    expect(await credited.asura.fetchMangaInfo('omniscient-readers-viewpoint')).toMatchObject({
      authors: ['hong daeui', 'Q10'],
      artists: ['Fit', 'Geonjin'],
    });

    detail.body.series.author = '';
    delete detail.body.series.artist;
    const uncredited = await provider({ [url(detail)]: detail }).asura.fetchMangaInfo('omniscient-readers-viewpoint');
    expect(uncredited).not.toHaveProperty('authors');
    expect(uncredited).not.toHaveProperty('artists');
  });

  it("rejects with the API's error for an unknown series", async () => {
    const { asura } = provider({
      [`${API}/series/this-does-not-exist-zzz/chapters`]: fixture('series-not-found'),
    });

    await expect(asura.fetchMangaInfo('this-does-not-exist-zzz')).rejects.toThrow(
      'AsuraScans: series not found (404)'
    );
  });
});

describe('AsuraScans fetchChapterPages', () => {
  it('follows the contract, counting pages from 1, with no image headers', async () => {
    const { asura, get } = provider();

    const pages = await asura.fetchChapterPages('omniscient-readers-viewpoint/chapter/1');

    expectChapterPages(pages);
    expect(requested(get)).toEqual([`${API}/series/omniscient-readers-viewpoint/chapters/1`]);
    // cdn.asurascans.com serves images without a Referer, so pages carry no headerForImage.
    expect(pages).toEqual([
      {
        page: 1,
        img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/001.webp?v=1770499638',
      },
      {
        page: 2,
        img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/002.webp?v=1770499638',
      },
      {
        page: 3,
        img: 'https://cdn.asurascans.com/asura-images/chapters/omniscient-readers-viewpoint/1/003.webp?v=1770499638',
      },
    ]);
  });

  it('fetches decimal chapters by their number', async () => {
    const { asura, get } = provider();

    const pages = await asura.fetchChapterPages('solo-farming-in-the-tower/chapter/100.5');

    expectChapterPages(pages);
    expect(requested(get)).toEqual([`${API}/series/solo-farming-in-the-tower/chapters/100.5`]);
  });

  it.each([
    ['series/solo-max-level-newbie-d9977a85/chapter/66', '/series/solo-max-level-newbie-d9977a85/chapters/66'],
    ['solo-max-level-newbie-d9977a85/chapter/66', '/series/solo-max-level-newbie-d9977a85/chapters/66'],
    ['/comics/omniscient-readers-viewpoint-3ebcc5a9/chapter/1', '/series/omniscient-readers-viewpoint-3ebcc5a9/chapters/1'],
  ])('accepts the older chapter id %s', async (chapterId, path) => {
    const { asura, get } = provider({ [`${API}${path}`]: fixture('chapter-omniscient-readers-viewpoint-1') });

    expectChapterPages(await asura.fetchChapterPages(chapterId));
    expect(requested(get)).toEqual([`${API}${path}`]);
  });

  it('rejects an early-access chapter with its unlock time', async () => {
    const { asura } = provider();

    await expect(asura.fetchChapterPages('solo-farming-in-the-tower/chapter/149')).rejects.toThrow(
      'AsuraScans: chapter is in early access until 2026-10-30T17:57:25.223823Z'
    );
  });

  it('rejects an id that names no chapter without a request', async () => {
    const { asura, get } = provider();

    await expect(asura.fetchChapterPages('omniscient-readers-viewpoint')).rejects.toThrow('invalid chapter id');
    expect(get).not.toHaveBeenCalled();
  });
});
