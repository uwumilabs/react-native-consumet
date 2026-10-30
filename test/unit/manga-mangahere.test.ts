import { readFileSync } from 'fs';
import { join } from 'path';

import { MediaStatus } from '../../src/models';
import { MangaHere } from '../../src/providers/manga/mangahere';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';

// Responses recorded from https://www.mangahere.cc on 2026-10-30 at 14:27 UTC, trimmed to the parts
// the provider reads (fixtures/manga/mangahere): two search pages and an empty one, the Tomodachi Game
// and Kingdom title pages (the newest and oldest chapters only), a page-by-page chapter with its
// chapterfun.ashx answers, and a long-strip chapter.
const BASE = 'https://www.mangahere.cc';
const RECORDED_AT = Date.parse('2026-10-30T14:27:00Z');
const IMAGE_HEADERS = { Referer: `${BASE}/` };
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/manga/mangahere', name), 'utf8');

type Answer = string | ((url: string) => string);

/** A MangaHere whose context axios answers `routes` (URL → fixture name, or a function) and records calls. */
const stub = (routes: Record<string, Answer>) => {
  const calls: { url: string; config: any }[] = [];
  const get = jest.fn(async (url: string, config?: any) => {
    calls.push({ url, config });
    const answer = routes[url];
    if (answer === undefined) throw new Error(`unexpected request: ${url}`);
    return { data: typeof answer === 'function' ? answer(url) : fixture(answer) };
  });
  return { calls, mangahere: new MangaHere({ ...createProviderContext(), axios: { get } as any }) };
};

const CHAPTER = 'kingdom/v46/c500.5';
const CHAPTER_URL = `${BASE}/manga/${CHAPTER}/1.html`;
const KEY = 'bdd058d00c88752f'; // the guidkey packed into the chapter page
const chapterFun = (page: number, key = KEY) =>
  `${BASE}/manga/${CHAPTER}/chapterfun.ashx?cid=448123&page=${page}&key=${key}`;
const CHAPTER_IMAGES = [
  'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/eimg001.jpg',
  'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/eimg002.jpg',
  'https://zjcdn.mangahere.org/store/manga/8198/46-500.5/compressed/ecmg002.jpg',
];

afterEach(() => jest.restoreAllMocks());

describe('MangaHere search', () => {
  const routes = {
    [`${BASE}/search?title=tomodachi%20game&page=1`]: 'search-tomodachi-game.html',
    [`${BASE}/search?title=tomodachi%20game&page=35`]: 'search-tomodachi-game-page-35.html',
    [`${BASE}/search?title=zzqqxxnotfound&page=1`]: 'search-no-results.html',
  };

  it('returns results that follow the manga contract', async () => {
    const { mangahere, calls } = stub(routes);

    const search = await mangahere.search('tomodachi game');

    expectMangaSearch(search);
    // The query is URL-encoded.
    expect(calls[0]!.url).toBe(`${BASE}/search?title=tomodachi%20game&page=1`);
    expect(search.currentPage).toBe(1);
    expect(search.results.map((result) => result.id)).toEqual(['tomodachi_game', 'tomodachi_ijou', 'hon_no_tomodachi']);
    expect(search.results[0]).toEqual({
      id: 'tomodachi_game',
      title: 'Tomodachi Game',
      url: `${BASE}/manga/tomodachi_game/`,
      image:
        'https://fmcdn.mangahere.com/store/manga/15338/cover.jpg?token=e444bd3545fa09a886a528796738acc03fa555ed&ttl=1793455200&v=1729750652',
      headerForImage: IMAGE_HEADERS,
      description:
        'Katagiri Yuichi believes that friends are more important than money, but he also knows the hardships of not ha...',
      status: MediaStatus.ONGOING,
    });
    // The site gives no synopsis for this one, so it has no description.
    expect(search.results[2]).toMatchObject({ id: 'hon_no_tomodachi', status: MediaStatus.COMPLETED });
    expect(search.results[2]).not.toHaveProperty('description');
  });

  it('reads hasNextPage from the pager', async () => {
    const { mangahere } = stub(routes);

    expect((await mangahere.search('tomodachi game')).hasNextPage).toBe(true);
    const last = await mangahere.search('tomodachi game', 35);
    expect(last).toMatchObject({ currentPage: 35, hasNextPage: false });
    expect(last.results.map((result) => result.title)).toEqual(['Hamefura x Arte']);
  });

  it('returns no results and no next page when nothing matches', async () => {
    const { mangahere } = stub(routes);

    expect(await mangahere.search('zzqqxxnotfound')).toEqual({ currentPage: 1, hasNextPage: false, results: [] });
  });
});

describe('MangaHere fetchMangaInfo', () => {
  const routes = {
    [`${BASE}/manga/tomodachi_game/`]: 'info-tomodachi_game.html',
    [`${BASE}/manga/kingdom/`]: 'info-kingdom.html',
    // Unknown titles redirect to the search page.
    [`${BASE}/manga/no_such_manga/`]: 'search-no-results.html',
  };

  it('returns the title and its chapters in reading order', async () => {
    const { mangahere } = stub(routes);

    const info = await mangahere.fetchMangaInfo('tomodachi_game');

    expectMangaInfo(info);
    expect(info).toMatchObject({
      id: 'tomodachi_game',
      title: 'Tomodachi Game',
      url: `${BASE}/manga/tomodachi_game/`,
      image:
        'https://fmcdn.mangahere.com/store/manga/15338/cover.jpg?token=e444bd3545fa09a886a528796738acc03fa555ed&ttl=1793455200&v=1729750652',
      headerForImage: IMAGE_HEADERS,
      genres: ['Mystery', 'Drama', 'Shounen', 'Psychological', 'Ecchi'],
      status: MediaStatus.ONGOING,
      rating: 4.84,
      authors: ['YAMAGUCHI Mikoto'],
    });
    // The full synopsis, not the shortened one with a "more" link.
    expect(info.description).toMatch(/^Katagiri Yuichi believes .* faith in one another\.$/s);
    expect(info).not.toHaveProperty('headers');

    // The site lists the newest first, and Ch.126.2 after Ch.126.5.
    const chapters = info.chapters!;
    expect(chapters.map((chapter) => chapter.chapterNumber)).toEqual([1, 2, 3, 126, 126.2, 126.5, 127, 127.5]);
    expect(chapters[0]).toEqual({
      id: 'tomodachi_game/c001',
      title: 'Ch.001 - Huh? Is Yuuichi-Kun Doubting His Friends?',
      chapterNumber: 1,
      releaseDate: '2014-09-22',
      url: `${BASE}/manga/tomodachi_game/c001/1.html`,
    });
    expect(chapters.at(-1)).toMatchObject({ id: 'tomodachi_game/c127.5', title: 'Ch.127.5', releaseDate: '2024-10-24' });
    // No chapter of this title has a volume.
    expect(chapters.some((chapter) => 'volumeNumber' in chapter)).toBe(false);
  });

  it('reads volume numbers and relative release dates', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(RECORDED_AT);
    const { mangahere } = stub(routes);

    const info = await mangahere.fetchMangaInfo('kingdom');

    expectMangaInfo(info);
    expect(info.chapters!.map(({ id, chapterNumber, volumeNumber }) => ({ id, chapterNumber, volumeNumber }))).toEqual([
      { id: 'kingdom/v01/c001', chapterNumber: 1, volumeNumber: 1 },
      { id: 'kingdom/v01/c002', chapterNumber: 2, volumeNumber: 1 },
      { id: 'kingdom/v01/c003', chapterNumber: 3, volumeNumber: 1 },
      { id: 'kingdom/v51/c891', chapterNumber: 891, volumeNumber: 51 },
      { id: 'kingdom/v51/c892', chapterNumber: 892, volumeNumber: 51 },
    ]);
    expect(info.chapters!.map((chapter) => chapter.title)).toContain('Vol.51 Ch.892');
    // "7 hour ago" at 14:27 UTC, rounded down to the hour; "Oct 23,2026" as a date.
    expect(info.chapters!.slice(-2).map((chapter) => chapter.releaseDate)).toEqual([
      '2026-10-23',
      '2026-10-30T07:00:00.000Z',
    ]);
  });

  it.each([
    ['Today', '2026-10-30'],
    ['Yesterday', '2026-10-29'],
    ['45 minutes ago', '2026-10-30T13:42:00.000Z'],
    ['2 day ago', '2026-10-28T00:00:00.000Z'],
  ])('reads a release date of %s as %s', async (text, iso) => {
    // The recorded page with the newest chapter's date rewritten.
    jest.spyOn(Date, 'now').mockReturnValue(RECORDED_AT);
    const { mangahere } = stub({ [`${BASE}/manga/kingdom/`]: () => fixture('info-kingdom.html').replace('"title2">7 hour ago', `"title2">${text}`) });

    const info = await mangahere.fetchMangaInfo('kingdom');

    expect(info.chapters!.at(-1)!.releaseDate).toBe(iso);
  });

  it('sends the adult-content cookie without the platform cookie jar', async () => {
    const { mangahere, calls } = stub(routes);

    await mangahere.fetchMangaInfo('kingdom');

    expect(calls[0]!.config).toMatchObject({ headers: { Cookie: 'isAdult=1' }, withCredentials: false });
  });

  it('throws for an id the site does not have', async () => {
    const { mangahere } = stub(routes);

    await expect(mangahere.fetchMangaInfo('no_such_manga')).rejects.toThrow("MangaHere has no manga 'no_such_manga'");
  });
});

describe('MangaHere fetchChapterPages', () => {
  const pageByPage = (overrides: Record<string, Answer> = {}) =>
    stub({
      [CHAPTER_URL]: 'chapter-kingdom-v46-c500.5.html',
      [chapterFun(1)]: 'chapterfun-kingdom-v46-c500.5-page1.js',
      [chapterFun(2)]: 'chapterfun-kingdom-v46-c500.5-page2.js',
      [chapterFun(3)]: 'chapterfun-kingdom-v46-c500.5-page3.js',
      ...overrides,
    });
  const chapterFunPages = (calls: { url: string }[]) =>
    calls.filter(({ url }) => url.includes('chapterfun.ashx')).map(({ url }) => Number(/page=(\d+)/.exec(url)![1]));

  it('decodes the page-by-page reader, asking for every other page', async () => {
    const { mangahere, calls } = pageByPage();

    const pages = await mangahere.fetchChapterPages(CHAPTER);

    expectChapterPages(pages);
    expect(pages).toEqual(CHAPTER_IMAGES.map((img, i) => ({ page: i + 1, img, headerForImage: IMAGE_HEADERS })));
    // Each chapterfun.ashx answer names the page asked for and the next one.
    expect(chapterFunPages(calls)).toEqual([1, 3]);
    const pageRequest = calls.find(({ url }) => url === chapterFun(1))!;
    expect(pageRequest.config).toMatchObject({
      headers: { 'Referer': CHAPTER_URL, 'X-Requested-With': 'XMLHttpRequest', 'Cookie': 'isAdult=1' },
      withCredentials: false,
    });
    expect(calls.every(({ config }) => config?.withCredentials === false)).toBe(true);
  });

  it('asks again with an empty key when the answer is empty', async () => {
    const { mangahere, calls } = pageByPage({
      [chapterFun(1)]: () => '',
      [chapterFun(1, '')]: 'chapterfun-kingdom-v46-c500.5-page1.js',
    });

    const pages = await mangahere.fetchChapterPages(CHAPTER);

    expect(pages.map((page) => page.img)).toEqual(CHAPTER_IMAGES);
    expect(calls.map(({ url }) => url)).toContain(chapterFun(1, ''));
  });

  it('asks for a missing page on its own after its request kept failing', async () => {
    let failures = 0;
    const { mangahere, calls } = pageByPage({
      [chapterFun(1)]: () => {
        if (failures++ < 3) throw new Error('socket hang up');
        return fixture('chapterfun-kingdom-v46-c500.5-page1.js');
      },
    });

    const pages = await mangahere.fetchChapterPages(CHAPTER);

    expectChapterPages(pages);
    expect(pages.map((page) => page.img)).toEqual(CHAPTER_IMAGES);
    // Pages 1 and 3 at once (page 1 failing three times), then pages 1 and 2 again.
    expect(chapterFunPages(calls)).toEqual([1, 3, 1, 1, 1, 2]);
  });

  it('throws when a page stays missing', async () => {
    const { mangahere } = pageByPage({
      [chapterFun(1)]: () => {
        throw new Error('socket hang up');
      },
      [chapterFun(2)]: () => {
        throw new Error('socket hang up');
      },
    });

    await expect(mangahere.fetchChapterPages(CHAPTER)).rejects.toThrow('socket hang up');
  });

  it('reads every image of the long-strip reader from its packed script', async () => {
    const chapter = 'start_by_signing_in_and_obtaining_the_ancient_divine_body/c176';
    const { mangahere, calls } = stub({ [`${BASE}/manga/${chapter}/1.html`]: 'chapter-start_by_signing_in-c176.html' });

    const pages = await mangahere.fetchChapterPages(chapter);

    expectChapterPages(pages);
    expect(pages).toHaveLength(91);
    expect(pages[0]).toEqual({
      page: 1,
      img: 'https://zjcdn.mangahere.org/store/manga/48244/176.0/compressed/gp_001.jpg',
      headerForImage: IMAGE_HEADERS,
    });
    // The site's own name for the last image.
    expect(pages[90]!.img).toBe('https://zjcdn.mangahere.org/store/manga/48244/176.0/compressed/6p_090.jpg');
    expect(calls).toHaveLength(1);
  });
});
