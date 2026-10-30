import { readFileSync } from 'fs';
import { join } from 'path';
import { MediaStatus } from '../../src/models';
import { FlameScans } from '../../src/providers/manga/flamescans';
import createProviderContext from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';

// Recorded (trimmed) responses from flamecomics.xyz: the home page (for the Next.js build id), and the
// data routes of the browse page, series 101 and its chapter 45.
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/manga/flamescans', name), 'utf8');
const HOME = fixture('home.html');
const BUILD_ID = 'fIDHjkKs1HH8MedfXh2pb';
const DATA: Record<string, unknown> = {
  'browse': JSON.parse(fixture('browse.json')),
  'series/101': JSON.parse(fixture('series-101.json')),
  'series/101/1e909a4cc7962148': JSON.parse(fixture('chapter-101-1e909a4cc7962148.json')),
};
// What the site answers (404) for a page that doesn't exist, and for any page of a replaced build.
const NOT_FOUND = { notFound: true };
const OLD_BUILD = { __N_SSG: true, pageProps: {} };

const BASE = 'https://flamecomics.xyz';
const CDN = 'https://cdn.flamecomics.xyz/uploads/images/series';

/** A context axios that serves the recordings, rejecting like axios on statuses validateStatus refuses. */
const stubContext = ({ homePages = [HOME], data = DATA }: { homePages?: string[]; data?: Record<string, unknown> } = {}) => {
  let homeRequests = 0;
  const respond = (url: string): { status: number; data: unknown } => {
    if (url === `${BASE}/`) return { status: 200, data: homePages[Math.min(homeRequests++, homePages.length - 1)] };
    const route = new RegExp(`^${BASE}/_next/data/([^/]+)/(.+)\\.json$`).exec(url);
    if (!route) return { status: 404, data: '<html>404</html>' };
    if (route[1] !== BUILD_ID) return { status: 404, data: OLD_BUILD };
    return route[2]! in data ? { status: 200, data: data[route[2]!] } : { status: 404, data: NOT_FOUND };
  };
  const get = jest.fn(async (url: string, config?: { validateStatus?: (status: number) => boolean }) => {
    const response = respond(url);
    const ok = config?.validateStatus ?? ((status: number) => status >= 200 && status < 300);
    if (!ok(response.status))
      throw Object.assign(new Error(`Request failed with status code ${response.status}`), { response });
    return { ...response, headers: {} };
  });
  const urls = () => get.mock.calls.map(([url]) => url);
  return { ctx: { ...createProviderContext(), axios: { get } as any }, urls };
};

describe('FlameScans (Flame Comics) search', () => {
  it('returns the series whose title has every word of the query, in the shared shape', async () => {
    const { ctx, urls } = stubContext();

    const search = await new FlameScans(ctx).search('returners magic');

    expectMangaSearch(search);
    expect(search).toEqual({
      currentPage: 1,
      hasNextPage: false,
      results: [
        {
          id: '12',
          title: "A Returner's Magic Should Be Special",
          url: `${BASE}/series/12`,
          image: `${CDN}/12/thumbnail.png?1744373084`,
          description: expect.stringMatching(/^"Now that I'm back, I won't allow my loved ones to die again!"/),
          status: MediaStatus.CANCELLED,
          releaseDate: 2018,
        },
      ],
    });
    expect(urls()).toEqual([`${BASE}/`, `${BASE}/_next/data/${BUILD_ID}/browse.json`]);
  });

  it('leaves out the web novels the browse page also lists', async () => {
    const { ctx } = stubContext();

    const { results } = await new FlameScans(ctx).search('Return');

    // "The Return of the Disaster-Class Hero" is only a novel (novel_id, no series_id).
    expect(results.map((result) => [result.id, result.title])).toEqual([
      ['12', "A Returner's Magic Should Be Special"],
      ['101', 'Clever Cleaning Life Of The Returned Genius Hunter'],
      ['54', 'Hero Has Returned'],
    ]);
  });

  it.each([
    ['Dropped', 'returners magic', MediaStatus.CANCELLED],
    ['Completed', 'solo leveling', MediaStatus.COMPLETED],
    ['Hiatus', 'hero has returned', MediaStatus.HIATUS],
    ['Coming Soon', 'little prince', MediaStatus.NOT_YET_AIRED],
    ['Ongoing', 'clever cleaning', MediaStatus.ONGOING],
  ])('maps the site status %s (%s) to %s', async (_siteStatus, query, status) => {
    const { results } = await new FlameScans(stubContext().ctx).search(query);
    expect(results.map((result) => result.status)).toEqual([status]);
  });

  it('puts every match on page 1 and looks the build id up once', async () => {
    const { ctx, urls } = stubContext();
    const flame = new FlameScans(ctx);

    await flame.search('solo');
    const second = await flame.search('solo', 2);

    expect(second).toEqual({ currentPage: 2, hasNextPage: false, results: [] });
    expect(urls().filter((url) => url === `${BASE}/`)).toHaveLength(1);
  });

  it('looks the build id up again when a deploy replaced it', async () => {
    const { ctx, urls } = stubContext({ homePages: [HOME.replace(BUILD_ID, 'replacedBuild123'), HOME] });

    const { results } = await new FlameScans(ctx).search('solo leveling');

    expect(results.map((result) => result.id)).toEqual(['1']);
    expect(urls()).toEqual([
      `${BASE}/`,
      `${BASE}/_next/data/replacedBuild123/browse.json`,
      `${BASE}/`,
      `${BASE}/_next/data/${BUILD_ID}/browse.json`,
    ]);
  });
});

describe('FlameScans (Flame Comics) fetchMangaInfo', () => {
  it('returns the series in the shared shape', async () => {
    const info = await new FlameScans(stubContext().ctx).fetchMangaInfo('101');

    expectMangaInfo(info);
    expect({ ...info, description: undefined, chapters: undefined }).toEqual({
      id: '101',
      title: 'Clever Cleaning Life Of The Returned Genius Hunter',
      // The site's list has stray spaces around each title.
      altTitles: ['회귀한 천재 헌터의 슬기로운 청소생활', 'The Dungeon Cleaning Life of a Once Genius Hunter'],
      url: `${BASE}/series/101`,
      image: `${CDN}/101/thumbnail.jpg?1784652307`,
      status: MediaStatus.ONGOING,
      releaseDate: 2022,
      genres: ['Fantasy', 'Reincarnation', 'Monster', 'Dungeons', 'Hunter'],
      authors: ['Moonbeat'],
      artists: ['Goilgoil'],
      description: undefined,
      chapters: undefined,
    });
    // The cover CDN serves without a Referer, so there are no image headers.
    expect(info.headerForImage).toBeUndefined();
  });

  it('turns the HTML description into plain text', async () => {
    const { description } = await new FlameScans(stubContext().ctx).fetchMangaInfo('101');

    expect(description).toMatch(/^Kim Jun-Woo, the world's first SSS rank genius hunter\./);
    expect(description).toMatch(/his crazy cleaning begins!$/);
    expect(description).not.toMatch(/[<>]/);
  });

  it('keeps the paragraphs of a description apart', async () => {
    // The description of series 154, as the site sends it.
    const html =
      '<p class="mantine-focus-auto m_b6d8b162 mantine-Text-root">The Great Northern Wall. The Dragon Knights.</p>' +
      '<p class="mantine-focus-auto m_b6d8b162 mantine-Text-root">These are the various titles of the Grand Ducal Clan Ragnar.</p>';
    const recorded = DATA['series/101'] as { pageProps: { series: object } };
    const series101 = { ...recorded, pageProps: { ...recorded.pageProps, series: { ...recorded.pageProps.series, description: html } } };
    const { ctx } = stubContext({ data: { ...DATA, 'series/101': series101 } });

    const { description } = await new FlameScans(ctx).fetchMangaInfo('101');

    expect(description).toBe(
      'The Great Northern Wall. The Dragon Knights.\n\nThese are the various titles of the Grand Ducal Clan Ragnar.'
    );
  });

  it('lists chapters first to last by number, labelled like the site', async () => {
    const { chapters = [] } = await new FlameScans(stubContext().ctx).fetchMangaInfo('101');

    expect(chapters.map((chapter) => [chapter.chapterNumber, chapter.title])).toEqual([
      [1, 'Chapter 1'],
      [2, 'Chapter 2'],
      [3, 'Chapter 3'],
      [44, 'Chapter 44 - Season 1 End'],
      // Re-uploaded later (released 2024-11-21), but read between 44 and 45.
      [44.5, 'Chapter 44.5'],
      [45, 'Chapter 45 - Season 2 Start'],
      [136, 'Chapter 136'],
      [136, 'Chapter 136'],
      [150, 'Chapter 150 - Season 3 End'],
      [151, 'Chapter 151 - Season 4 Start'],
      [155, 'Chapter 155'],
      [156, 'Chapter 156'],
    ]);
    expect(chapters[0]).toEqual({
      id: '101/327c2f17ef9cacd3',
      title: 'Chapter 1',
      chapterNumber: 1,
      releaseDate: '2022-06-29T00:00:00.000Z',
      url: `${BASE}/series/101/327c2f17ef9cacd3`,
    });
    expect(chapters[4]!.releaseDate).toBe('2024-11-21T08:49:00.000Z');
    // Chapter 136 was uploaded twice; the earlier upload comes first.
    expect(chapters.slice(6, 8).map((chapter) => chapter.id)).toEqual(['101/57cb3b4765bdacc8', '101/383e8bfb8e33af5e']);
  });

  it('rejects ids that are not series numbers without a request', async () => {
    const { ctx, urls } = stubContext();

    await expect(new FlameScans(ctx).fetchMangaInfo('returners-magic-should-be-special')).rejects.toThrow(
      /invalid series id/
    );
    expect(urls()).toEqual([]);
  });

  it('reports a missing series without looking the build id up again', async () => {
    const { ctx, urls } = stubContext();

    await expect(new FlameScans(ctx).fetchMangaInfo('99999')).rejects.toThrow('FlameComics: /series/99999 not found');
    expect(urls()).toEqual([`${BASE}/`, `${BASE}/_next/data/${BUILD_ID}/series/99999.json`]);
  });
});

describe('FlameScans (Flame Comics) fetchChapterPages', () => {
  it('returns the pages from 1, with the edit time the site adds to image URLs', async () => {
    const pages = await new FlameScans(stubContext().ctx).fetchChapterPages('101/1e909a4cc7962148');

    expectChapterPages(pages);
    // edit_time (1747932144), not release_date (1696636800); no headers, the CDN needs no Referer.
    expect(pages).toEqual([
      { img: `${CDN}/101/1e909a4cc7962148/CGH45-0-1.jpg?1747932144`, page: 1 },
      { img: `${CDN}/101/1e909a4cc7962148/CGH45-1-1.jpg?1747932144`, page: 2 },
      { img: `${CDN}/101/1e909a4cc7962148/CGH45-2-1.jpg?1747932144`, page: 3 },
    ]);
  });

  it('fetches the pages of a chapter listed by fetchMangaInfo', async () => {
    const { ctx, urls } = stubContext();
    const flame = new FlameScans(ctx);

    const { chapters = [] } = await flame.fetchMangaInfo('101');
    const chapter = chapters.find((c) => c.chapterNumber === 45)!;
    await flame.fetchChapterPages(chapter.id);

    expect(urls().at(-1)).toBe(`${BASE}/_next/data/${BUILD_ID}/series/101/1e909a4cc7962148.json`);
  });

  it('rejects chapter ids that are not <seriesId>/<token>', async () => {
    await expect(new FlameScans(stubContext().ctx).fetchChapterPages('1e909a4cc7962148')).rejects.toThrow(
      /invalid chapter id/
    );
  });
});
