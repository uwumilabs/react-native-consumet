import { readFileSync } from 'fs';
import { join } from 'path';
import { MediaStatus } from '../../src/models';
import { MangaKakalot } from '../../src/providers/manga/mangakakalot';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';

// Recorded www.kakamanga.com responses (mangakakalot.gg redirects there), trimmed; each file says
// which request it answers.
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures/manga/mangakakalot', name), 'utf8');
const json = (name: string) => JSON.parse(fixture(name));

const BASE = 'https://www.kakamanga.com';
const REFERER = { Referer: 'https://www.kakamanga.com/' };

/** A context whose axios answers GETs from `responses` (URL → body) and records every URL. */
function stubbed(responses: Record<string, unknown>) {
  const get = jest.fn(async (url: string) => {
    if (!(url in responses)) throw new Error(`unexpected request: ${url}`);
    return { data: responses[url] };
  });
  const provider = new MangaKakalot({ ...createProviderContext(), axios: { get } as any });
  return { provider, get };
}

const searchUrl = (word: string, page = 1) => `${BASE}/home/search/json?searchword=${word}&page=${page}`;
const chaptersUrl = (offset: number) => `${BASE}/api/manga/noa-senpai-wa-tomodachi/chapters?limit=500&offset=${offset}`;

describe('MangaKakalot search', () => {
  it('reads the results page into the contract shape', async () => {
    const { provider, get } = stubbed({ [searchUrl('tomodachi_game')]: fixture('search-tomodachi-game.html') });

    const search = await provider.search('Tomodachi Game');

    expectMangaSearch(search);
    expect(get).toHaveBeenCalledTimes(1);
    expect(search.currentPage).toBe(1);
    expect(search.hasNextPage).toBe(true);
    expect(search.results.map((r) => r.id)).toEqual([
      'tomodachi-game',
      'onee-chan-no-tomodachi-ga-kyou-mo-ore-wo-batsu-game-ni-tsukau',
      'reincarnation-in-the-game-world-dankatsu-comic-game-addict-plays-encouragement-for-job-hunting-in-dungeons-from-a-new-game',
    ]);
    expect(search.results[0]).toEqual({
      id: 'tomodachi-game',
      title: 'Tomodachi Game',
      url: `${BASE}/manga/tomodachi-game`,
      image: 'https://imgs-2.2xstorage.com/thumb/tomodachi-game.webp',
      headerForImage: REFERER,
    });
    // Entities in titles are decoded.
    expect(search.results[2]!.title).toBe(
      'Reincarnation in the Game World Dankatsu @Comic: Game Addict Plays "Encouragement for Job Hunting in Dungeons" from a "New Game"'
    );
  });

  it('sends the query the way the search box does: punctuation and spaces as `_`', async () => {
    const { provider, get } = stubbed({ [searchUrl('re_zero_kara', 3)]: fixture('search-no-results.html') });

    await provider.search(' Re:Zero  kara! ', 3);

    expect(get).toHaveBeenCalledWith(searchUrl('re_zero_kara', 3));
  });

  it('reports no next page on the last page', async () => {
    const { provider } = stubbed({ [searchUrl('zzzzqqqxxw')]: fixture('search-no-results.html') });

    expect(await provider.search('zzzzqqqxxw')).toEqual({ currentPage: 1, hasNextPage: false, results: [] });
  });

  // Cloudflare caches the endpoint's JSON form (the search box's own requests) under the same URL.
  it.each([
    ['parsed by axios', json('search-tomodachi-game.json')],
    ['as text', fixture('search-tomodachi-game.json')],
  ])('reads the JSON form of the results page (%s)', async (_how, body) => {
    const { provider } = stubbed({ [searchUrl('tomodachi_game', 2)]: body });

    const search = await provider.search('tomodachi game', 2);

    expectMangaSearch(search);
    expect(search.results).toHaveLength(20);
    // The JSON form has no pagination; a full page of 20 is taken to have a next one.
    expect(search).toMatchObject({ currentPage: 2, hasNextPage: true });
    expect(search.results[0]).toEqual({
      id: 'tomodachi-game',
      title: 'Tomodachi Game',
      url: `${BASE}/manga/tomodachi-game`,
      image: 'https://imgs-2.2xstorage.com/thumb/tomodachi-game.webp',
      headerForImage: REFERER,
    });
  });
});

describe('MangaKakalot fetchMangaInfo', () => {
  const responses = () => ({
    [`${BASE}/manga/noa-senpai-wa-tomodachi`]: fixture('manga-noa-senpai-wa-tomodachi.html'),
    [chaptersUrl(0)]: json('chapters-noa-senpai-wa-tomodachi-offset-0.json'),
    // The first page holds 6 chapters (trimmed) and has_more, so the next request starts at 6.
    [chaptersUrl(6)]: json('chapters-noa-senpai-wa-tomodachi-offset-150.json'),
  });

  it('reads the title page and the chapter-list API into the contract shape', async () => {
    const { provider, get } = stubbed(responses());

    const info = await provider.fetchMangaInfo('noa-senpai-wa-tomodachi');

    expectMangaInfo(info);
    expect(get.mock.calls.map(([url]) => url).sort()).toEqual(Object.keys(responses()).sort());
    const { chapters, description, ...rest } = info;
    expect(rest).toEqual({
      id: 'noa-senpai-wa-tomodachi',
      title: 'Noa-senpai wa Tomodachi.',
      url: `${BASE}/manga/noa-senpai-wa-tomodachi`,
      image: 'https://img-r1.2xstorage.com/thumb/noa-senpai-wa-tomodachi.webp',
      headerForImage: REFERER,
      authors: ['AKIYAMA Enma'],
      status: MediaStatus.ONGOING,
      genres: ['Comedy', 'Romance', 'Slice of life', 'Ecchi'],
      views: 2070221,
    });
    expect(chapters).toHaveLength(12);
  });

  it('turns the synopsis, stored as escaped HTML, into plain text', async () => {
    const { provider } = stubbed(responses());

    const { description } = await provider.fetchMangaInfo('noa-senpai-wa-tomodachi');

    expect(description).toMatch(
      /^Sometimes, when life is hard, you just need a "friend\."\n\nWorking at a game company/
    );
    expect(description).toContain(`Two people who usually wouldn't get along become "friends" by chance...?`);
    expect(description).toMatch(/a little heavy!\n\nhttps:\/\/www\.cmoa\.jp\/title\/2784\.\.\.$/);
    expect(description).not.toMatch(/&quot;|&amp;|&lt;|<br|<a |summary:/);
  });

  it('lists chapters first to last, numbered from their labels, with ISO release dates', async () => {
    const { provider } = stubbed(responses());

    const { chapters } = await provider.fetchMangaInfo('noa-senpai-wa-tomodachi');

    // The API lists newest first, 50 at a time on the site.
    expect(chapters!.map((c) => c.chapterNumber)).toEqual([1, 2, 3, 8, 8.5, 9, 98.3, 98.6, 108.3, 108.6, 137, 138]);
    expect(chapters![0]).toEqual({
      id: 'noa-senpai-wa-tomodachi/chapter-1',
      title: 'Chapter 1',
      chapterNumber: 1,
      releaseDate: '2024-11-12T21:03:50.000Z',
      views: 58670,
      url: `${BASE}/manga/noa-senpai-wa-tomodachi/chapter-1`,
    });
    // Named chapters keep their name; the slug is the site's own (some use `108.6`, some `98-6`).
    expect(chapters!.slice(-4).map((c) => [c.id, c.title])).toEqual([
      ['noa-senpai-wa-tomodachi/chapter-108.3', 'Chapter 108.3: Idol'],
      ['noa-senpai-wa-tomodachi/chapter-108.6', 'Chapter 108.6: Omake'],
      ['noa-senpai-wa-tomodachi/chapter-137', 'Chapter 137: Noa-Senpai and the Weird Rihito'],
      ['noa-senpai-wa-tomodachi/chapter-138', "Chapter 138: Rihito and Yesterday's Memories"],
    ]);
    expect(chapters!.find((c) => c.chapterNumber === 98.6)!.id).toBe('noa-senpai-wa-tomodachi/chapter-98-6');
    expect(chapters!.every((c) => c.volumeNumber === undefined)).toBe(true);
  });

  it('keeps one copy of a chapter that two API pages both return', async () => {
    // A chapter published between two requests shifts the offsets by one.
    const first = json('chapters-noa-senpai-wa-tomodachi-offset-0.json');
    const last = json('chapters-noa-senpai-wa-tomodachi-offset-150.json');
    last.data.chapters.unshift(first.data.chapters[5]);
    const { provider } = stubbed({ ...responses(), [chaptersUrl(0)]: first, [chaptersUrl(6)]: last });

    const { chapters } = await provider.fetchMangaInfo('noa-senpai-wa-tomodachi');

    expect(chapters!.filter((c) => c.chapterNumber === 98.3)).toHaveLength(1);
    expect(chapters).toHaveLength(12);
  });

  it('reads alternative titles, without the title itself, and leaves out what the page lacks', async () => {
    const slug = 'onee-chan-no-tomodachi-ga-kyou-mo-ore-wo-batsu-game-ni-tsukau';
    const { provider } = stubbed({
      [`${BASE}/manga/${slug}`]: fixture(`manga-${slug}.html`),
      [`${BASE}/api/manga/${slug}/chapters?limit=500&offset=0`]: json(`chapters-${slug}-offset-0.json`),
    });

    const info = await provider.fetchMangaInfo(slug);

    expectMangaInfo(info);
    expect(info.altTitles).toEqual(['My Sister’S Friend Is Using Me For A Punishment Game Again Today']);
    expect(info.status).toBe(MediaStatus.COMPLETED);
    // `Author(s) : ` and an empty synopsis.
    expect(info).not.toHaveProperty('authors');
    expect(info).not.toHaveProperty('description');
    expect(info.chapters).toEqual([
      {
        id: `${slug}/chapter-0`,
        title: 'Chapter 0',
        chapterNumber: 0,
        releaseDate: '2026-04-25T21:59:03.000Z',
        views: 1800,
        url: `${BASE}/manga/${slug}/chapter-0`,
      },
    ]);
  });

  it('leaves out the `Unknown` author placeholder', async () => {
    const { provider } = stubbed({
      [`${BASE}/manga/kanojo-no-tomodachi`]: fixture('manga-kanojo-no-tomodachi.html'),
      [`${BASE}/api/manga/kanojo-no-tomodachi/chapters?limit=500&offset=0`]: json(
        'chapters-kanojo-no-tomodachi-offset-0.json'
      ),
    });

    const info = await provider.fetchMangaInfo('kanojo-no-tomodachi');

    expectMangaInfo(info);
    expect(info).not.toHaveProperty('authors');
    expect(info).not.toHaveProperty('altTitles');
    expect(info.chapters!.map((c) => c.chapterNumber)).toEqual([99, 100]);
  });

  it('fails when the chapter-list API refuses the title', async () => {
    const { provider } = stubbed({
      [`${BASE}/manga/noa-senpai-wa-tomodachi`]: fixture('manga-noa-senpai-wa-tomodachi.html'),
      [chaptersUrl(0)]: { success: false, message: 'Invalid slug' },
    });

    await expect(provider.fetchMangaInfo('noa-senpai-wa-tomodachi')).rejects.toThrow(/Invalid slug/);
  });
});

describe('MangaKakalot fetchChapterPages', () => {
  it('returns the reader images from page 1, each with the Referer the image host needs', async () => {
    const { provider, get } = stubbed({
      [`${BASE}/manga/noa-senpai-wa-tomodachi/chapter-138`]: fixture(
        'chapter-noa-senpai-wa-tomodachi-chapter-138.html'
      ),
    });

    const pages = await provider.fetchChapterPages('noa-senpai-wa-tomodachi/chapter-138');

    expectChapterPages(pages);
    expect(get).toHaveBeenCalledTimes(1);
    expect(pages).toEqual(
      [0, 1, 2].map((i) => ({
        img: `https://img-r1.2xstorage.com/noa-senpai-wa-tomodachi/138/${i}.webp`,
        page: i + 1,
        headerForImage: REFERER,
      }))
    );
  });
});
