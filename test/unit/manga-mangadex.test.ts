import type { AxiosInstance } from 'axios';

import { MediaStatus } from '../../src/models';
import { MangaDex } from '../../src/providers/manga/mangadex';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';
import atHomeExternal from './fixtures/manga/mangadex/at-home-external.json';
import atHome from './fixtures/manga/mangadex/at-home-mieruko-chan-1.json';
import feedPage1 from './fixtures/manga/mangadex/feed-mieruko-chan-0.json';
import feedPage2 from './fixtures/manga/mangadex/feed-mieruko-chan-1.json';
import manga from './fixtures/manga/mangadex/manga-mieruko-chan.json';
import notFound from './fixtures/manga/mangadex/manga-not-found.json';
import search from './fixtures/manga/mangadex/search-tomodachi-game.json';

// Recorded api.mangadex.org responses, trimmed:
// - manga?title=Tomodachi Game&includes[]=cover_art: the first 3 of 6 results;
// - manga/{Mieruko-chan} with cover_art, author and artist;
// - manga/{Mieruko-chan}/feed in English: 9 of its 105 chapters, split over two pages (offset 0 and 5);
// - at-home/server for its chapter 1 (3 of 16 pages), and for an external K MANGA chapter;
// - manga/{unknown id}: the 404 body.

const MIERUKO_CHAN = '6670ee28-f26d-4b61-b49c-d71149cd5a6e';
const CHAPTER_1 = '5ac9a412-c6f0-4461-af0b-6b80f3086c2b';
const EXTERNAL_CHAPTER = '3a7dfd57-687c-4873-8f87-79f75b5f075c';
const UNKNOWN = '00000000-0000-0000-0000-000000000000';

/** The 404 axios throws, with MangaDex's error body. */
const notFoundError = () =>
  Object.assign(new Error('Request failed with status code 404'), {
    isAxiosError: true,
    code: 'ERR_BAD_REQUEST',
    response: { status: 404, data: notFound },
  });

/** Answers each request from the recorded responses; anything else fails the test. */
const route = (url: URL): unknown => {
  const path = url.pathname;
  if (path === '/manga') return search;
  if (path === '/manga/random') return { result: 'ok', response: 'entity', data: search.data[0] };
  if (path === `/manga/${MIERUKO_CHAN}`) return manga;
  if (path === `/manga/${MIERUKO_CHAN}/feed`) return url.searchParams.get('offset') === '0' ? feedPage1 : feedPage2;
  if (path === `/manga/${UNKNOWN}` || path === `/manga/${UNKNOWN}/feed`) throw notFoundError();
  if (path === `/at-home/server/${CHAPTER_1}`) return atHome;
  if (path === `/at-home/server/${EXTERNAL_CHAPTER}`) return atHomeExternal;
  throw new Error(`unexpected request: ${url}`);
};

const setup = (routes: (url: URL) => unknown = route) => {
  const get = jest.fn(async (url: string) => ({ data: routes(new URL(url)) }));
  const mangadex = new MangaDex({ ...createProviderContext(), axios: { get } as unknown as AxiosInstance });
  const requests = () => get.mock.calls.map(([url]) => new URL(url));
  return { mangadex, get, requests };
};

describe('MangaDex search', () => {
  it('returns results in the shared shape', async () => {
    const { mangadex } = setup();

    expectMangaSearch(await mangadex.search('Tomodachi Game'));
  });

  it('sends the query as one parameter and gets the covers in the same request', async () => {
    const { mangadex, requests } = setup();

    await mangadex.search('Tomodachi Game');

    expect(requests()).toHaveLength(1);
    const [url] = requests();
    expect(url!.origin + url!.pathname).toBe('https://api.mangadex.org/manga');
    expect(url!.searchParams.get('title')).toBe('Tomodachi Game');
    expect(url!.searchParams.getAll('includes[]')).toEqual(['cover_art']);
    expect(url!.searchParams.get('order[relevance]')).toBe('desc');
    expect([url!.searchParams.get('limit'), url!.searchParams.get('offset')]).toEqual(['20', '0']);
  });

  it('titles a result in English when it has an English title, keeping the others as strings', async () => {
    const { mangadex } = setup();

    const { results } = await mangadex.search('Tomodachi Game');

    // The main title is romaji ("Tomodachi Game"); the first English alt title wins.
    expect(results[0]!.title).toBe('Friends Games');
    expect(results[0]!.altTitles!.slice(0, 3)).toEqual(['Tomodachi Game', 'Przyjacielskie rozgrywki', 'トモダチゲーム']);
    expect(results[0]!.altTitles).not.toContain('Friends Games');
    // An English main title is used as it is.
    expect(results[1]!.title).toBe('Pocket Princess Game - Tomodachi ga Isekai no Himedattakara Maou ni Naru Koto ni Shita');
    expect(results.flatMap((result) => result.altTitles ?? []).every((title) => typeof title === 'string')).toBe(true);
  });

  it('gives a plain-text description, in English when there is one, and none when MangaDex has none', async () => {
    const { mangadex } = setup();

    const { results } = await mangadex.search('Tomodachi Game');

    expect(results[0]!.description).toMatch(/^Katagiri Yuichi believes/);
    expect(results[0]!.description).toContain('Shibe Makoto.\n\nSoon afterward');
    expect(results[0]!.description).not.toMatch(/\r| \n/);
    // Only a Japanese description.
    expect(results[1]!.description).toMatch(/^元プロゲーマー/);
    expect(results[2]).not.toHaveProperty('description');
  });

  it('maps status, cover, page URL and last chapter, leaving out what MangaDex leaves empty', async () => {
    const { mangadex } = setup();

    const { results } = await mangadex.search('Tomodachi Game');

    expect(results[0]).toMatchObject({
      id: 'b35f67b6-bfb9-4cbd-86f0-621f37e6cb41',
      status: MediaStatus.COMPLETED,
      releaseDate: 2013,
      url: 'https://mangadex.org/title/b35f67b6-bfb9-4cbd-86f0-621f37e6cb41',
      image:
        'https://uploads.mangadex.org/covers/b35f67b6-bfb9-4cbd-86f0-621f37e6cb41/20e9fdd6-9b70-4ba0-8202-3e24d6c72748.jpg.512.jpg',
      contentRating: 'suggestive',
      lastChapter: 127,
      lastVolume: 26,
    });
    expect(results[0]).not.toHaveProperty('headerForImage');
    // lastChapter and lastVolume are "".
    expect(results[2]).not.toHaveProperty('lastChapter');
    expect(results[2]).not.toHaveProperty('lastVolume');
  });

  it('pages with the limit and reports whether there are more results', async () => {
    const { mangadex, requests } = setup();

    // The recorded search has 6 results in total.
    expect((await mangadex.search('Tomodachi Game')).hasNextPage).toBe(false);
    expect(await mangadex.search('Tomodachi Game', 1, 3)).toMatchObject({ currentPage: 1, hasNextPage: true });
    expect(await mangadex.search('Tomodachi Game', 2, 3)).toMatchObject({ currentPage: 2, hasNextPage: false });
    expect(requests()[2]!.searchParams.get('offset')).toBe('3');
    await expect(mangadex.search('Tomodachi Game', 0)).rejects.toThrow('Page number must be greater than 0');
  });
});

describe('MangaDex list methods', () => {
  it('get the covers with the titles, in one request each', async () => {
    const { mangadex, requests } = setup();

    for (const list of [
      await mangadex.fetchPopular(),
      await mangadex.fetchLatestUpdates(),
      await mangadex.fetchRecentlyAdded(),
      await mangadex.fetchRandom(),
    ]) {
      expectMangaSearch(list);
      expect(list.results[0]!.title).toBe('Friends Games');
    }
    expect(requests().map((url) => url.searchParams.getAll('includes[]'))).toEqual([
      ['cover_art'],
      ['cover_art'],
      ['cover_art'],
      ['cover_art'],
    ]);
  });
});

describe('MangaDex fetchMangaInfo', () => {
  it('returns the title in the shared shape', async () => {
    const { mangadex } = setup();

    expectMangaInfo(await mangadex.fetchMangaInfo(MIERUKO_CHAN));
  });

  it('maps the title details to strings, a MediaStatus and plain text', async () => {
    const { mangadex } = setup();

    const info = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(info).toMatchObject({
      id: MIERUKO_CHAN,
      title: 'Mieruko-chan',
      status: MediaStatus.ONGOING,
      releaseDate: 2018,
      url: `https://mangadex.org/title/${MIERUKO_CHAN}`,
      // The full-size cover, where search results have the 512 px one.
      image: `https://uploads.mangadex.org/covers/${MIERUKO_CHAN}/13d41432-d7ec-41cd-a265-5af700989aa6.jpg`,
      authors: ['Izumi Tomoki'],
      artists: ['Izumi Tomoki'],
      genres: ['Thriller', 'Psychological', 'Comedy', 'Drama', 'Horror', 'Slice of Life', 'Mystery', 'Tragedy'],
      themes: ['Monsters', 'Ghosts', 'School Life', 'Supernatural'],
      malId: 116790,
    });
    expect(info.altTitles!.slice(0, 3)).toEqual(['見える子ちゃん', 'Can See Them–chan', 'The Girl Who Can See Them']);
    expect(info.altTitles).not.toContain('Mieruko-chan');
    // The Markdown rule, bold and link are gone; the link text stays.
    expect(info.description).toBe(
      'All of a sudden, Miko is able to see grotesque monsters all around her; but no one else can. Rather than ' +
        'trying to run away or face them, she instead musters all of her courage and… ignores them. Join in on her ' +
        'day-to-day life as she keeps up her best poker face despite the supernatural goings-on.\n\n' +
        'Alt Official Raw: niconico Manga'
    );
  });

  it('turns other Markdown descriptions into plain text', async () => {
    const infoWith = (description: Record<string, string>) =>
      setup((url) =>
        url.pathname === `/manga/${MIERUKO_CHAN}`
          ? { ...manga, data: { ...manga.data, attributes: { ...manga.data.attributes, description } } }
          : route(url)
      ).mangadex.fetchMangaInfo(MIERUKO_CHAN);

    // The recorded French description (the only one when there is no English one).
    expect((await infoWith({ fr: manga.data.attributes.description.fr })).description).toBe(
      'Officially Published:\n- In French by Ototo Manga'
    );
    // From Mairimashita! Iruma-kun's description, with a heading and list added.
    expect(
      (
        await infoWith({
          en: '## Synopsis\r\nEasy as\u00a0*aleph, bet, gimel*,\u00a0right?\r\n\r\n* [Official](https://example.com/a_(b))',
        })
      ).description
    ).toBe('Synopsis\nEasy as aleph, bet, gimel, right?\n\n- Official');
  });

  it('reads every page of the chapter feed, in the language asked for', async () => {
    const { mangadex, requests } = setup();

    const info = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(info.chapters).toHaveLength(9);
    const feeds = requests().filter((url) => url.pathname.endsWith('/feed'));
    expect(feeds.map((url) => url.searchParams.get('offset'))).toEqual(['0', '5']);
    const params = feeds[0]!.searchParams;
    expect(params.getAll('translatedLanguage[]')).toEqual(['en']);
    expect(params.getAll('includes[]')).toEqual(['scanlation_group']);
    expect(params.getAll('contentRating[]')).toEqual(['safe', 'suggestive', 'erotica', 'pornographic']);
    expect(params.get('includeExternalUrl')).toBe('0');
    expect(params.get('limit')).toBe('500');

    await mangadex.fetchMangaInfo(MIERUKO_CHAN, 'pt-br');
    expect(requests().pop()!.searchParams.getAll('translatedLanguage[]')).toEqual(['pt-br']);
  });

  it('lists chapters in reading order, several scanlations of a chapter oldest first', async () => {
    const { mangadex } = setup();

    const { chapters } = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(chapters!.map((chapter) => [chapter.chapterNumber, chapter.volumeNumber, chapter.scanlator])).toEqual([
      [1, 1, 'Fairy Knight University'],
      [4.5, 1, 'Fairy Knight University'],
      [16, 2, '/a/nonymous'],
      [16, 2, 'Fairy Knight University'],
      [55.5, 10, 'The real group is the friends we made along the way'],
      [69, 14, 'Pink Lion Scan'],
      [69, 14, 'Creeg Scans'],
      [71, undefined, 'Creeg Scans'],
      // A joint release.
      [73, undefined, 'Creeg Scans & Canidae'],
    ]);
  });

  it('keeps the feed order for titles whose chapter numbers restart each volume', async () => {
    const { mangadex } = setup((url) =>
      url.pathname === `/manga/${MIERUKO_CHAN}`
        ? {
            ...manga,
            data: { ...manga.data, attributes: { ...manga.data.attributes, chapterNumbersResetOnNewVolume: true } },
          }
        : route(url)
    );

    const { chapters } = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(chapters!.map((chapter) => chapter.id)).toEqual(
      [...feedPage1.data, ...feedPage2.data].map((chapter) => chapter.id)
    );
  });

  it('gives every chapter a string title, numbers, its language, date and page URL', async () => {
    const { mangadex } = setup();

    const { chapters } = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(chapters![0]).toEqual({
      id: CHAPTER_1,
      // MangaDex's title is "".
      title: 'Chapter 1',
      chapterNumber: 1,
      volumeNumber: 1,
      pages: 16,
      releaseDate: '2018-11-27T09:06:58+00:00',
      scanlator: 'Fairy Knight University',
      language: 'en',
      url: `https://mangadex.org/chapter/${CHAPTER_1}`,
    });
    expect(chapters!.map((chapter) => chapter.title)).toEqual([
      'Chapter 1',
      'Bonus',
      'Chapter 16',
      'Chapter 16',
      'Volume 10 Extras',
      'Chapter 69',
      'Chapter 69',
      'Chapter 71',
      'Chapter 73',
    ]);
    // No volume yet.
    expect(chapters![7]).not.toHaveProperty('volumeNumber');
  });

  it('titles a chapter with no number and no name as a oneshot', async () => {
    const oneshot = {
      ...feedPage1.data[0]!,
      attributes: { ...feedPage1.data[0]!.attributes, volume: null, chapter: null, title: null },
    };
    const { mangadex } = setup((url) =>
      url.pathname.endsWith('/feed') ? { ...feedPage1, data: [oneshot], total: 1 } : route(url)
    );

    const { chapters } = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

    expect(chapters).toEqual([expect.objectContaining({ title: 'Oneshot' })]);
    expect(chapters![0]).not.toHaveProperty('chapterNumber');
  });

  it("passes on MangaDex's error message", async () => {
    const { mangadex } = setup();

    await expect(mangadex.fetchMangaInfo(UNKNOWN)).rejects.toThrow(`[MangaDex] Manga \`${UNKNOWN}\` not found.`);
  });
});

describe('MangaDex fetchChapterPages', () => {
  it('returns the pages from the at-home server, numbered from 1', async () => {
    const { mangadex, requests } = setup();

    const pages = await mangadex.fetchChapterPages(CHAPTER_1);

    expectChapterPages(pages);
    expect(requests()[0]!.href).toBe(`https://api.mangadex.org/at-home/server/${CHAPTER_1}`);
    expect(pages).toEqual(
      atHome.chapter.data.map((file, i) => ({
        img: `https://cmdxd98sb0x3yprd.mangadex.network/data/7772ef83daffe1834c59424b8b65257b/${file}`,
        page: i + 1,
      }))
    );
  });

  it('returns the compressed images with dataSaver', async () => {
    const { mangadex } = setup();

    const pages = await mangadex.fetchChapterPages(CHAPTER_1, true);

    expectChapterPages(pages);
    expect(pages[0]!.img).toBe(
      `https://cmdxd98sb0x3yprd.mangadex.network/data-saver/7772ef83daffe1834c59424b8b65257b/${atHome.chapter.dataSaver[0]}`
    );
  });

  it('says so when the chapter is hosted on another site', async () => {
    const { mangadex } = setup();

    await expect(mangadex.fetchChapterPages(EXTERNAL_CHAPTER)).rejects.toThrow(
      `[MangaDex] Chapter ${EXTERNAL_CHAPTER} has no pages on MangaDex`
    );
  });
});
