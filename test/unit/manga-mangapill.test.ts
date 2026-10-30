import fs from 'fs';
import path from 'path';
import { MediaStatus, type ProviderContext } from '../../src/models';
import { MangaPill } from '../../src/providers/manga/mangapill';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from './helpers/manga-contract';

// Recorded MangaPill pages (2026-10-30), trimmed to the markup the provider reads; each fixture
// names its URL and what was cut.
const FIXTURES = path.join(__dirname, 'fixtures/manga/mangapill');
const PAGES: Record<string, string> = {
  'https://mangapill.com/search?q=one%20piece': 'search-one-piece.html',
  'https://mangapill.com/search?q=one%20piece&page=2': 'search-one-piece-page-2.html',
  'https://mangapill.com/manga/2/one-piece': 'manga-2-one-piece.html',
  'https://mangapill.com/manga/6290/one-piece-pirate-recipes': 'manga-6290-one-piece-pirate-recipes.html',
  'https://mangapill.com/chapters/2-11069000/one-piece-chapter-1069': 'chapter-2-11069000.html',
};
const page = (url: string) => fs.readFileSync(path.join(FIXTURES, PAGES[url]!), 'utf8');

// The image CDN (cdn.readdetectiveconan.com) answers 403 without it, for covers and pages.
const REFERER = { Referer: 'https://mangapill.com/' };

/** A MangaPill whose context axios serves the recorded pages, optionally rewritten. */
function mangaPill(rewrite: (url: string, html: string) => string = (_url, html) => html) {
  const get = jest.fn(async (url: string) => {
    if (!PAGES[url]) throw new Error(`unexpected request: ${url}`);
    return { data: rewrite(url, page(url)) };
  });
  const ctx: ProviderContext = { ...createProviderContext(), axios: { get } as unknown as ProviderContext['axios'] };
  return { provider: new MangaPill(ctx), get };
}

describe('MangaPill search', () => {
  it('follows the manga contract', async () => {
    expectMangaSearch(await mangaPill().provider.search('one piece'));
    expectMangaSearch(await mangaPill().provider.search('one piece', 2), 2);
  });

  it('maps each result card, with the cover Referer and the site link', async () => {
    const { provider, get } = mangaPill();

    const search = await provider.search('one piece');

    expect(get).toHaveBeenCalledWith('https://mangapill.com/search?q=one%20piece');
    expect(search).toEqual({
      currentPage: 1,
      hasNextPage: true,
      results: [
        {
          id: '2/one-piece',
          title: 'One Piece',
          image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp?h=01971742-5d7f-7f32-8d2b-d038279f8a73',
          headerForImage: REFERER,
          url: 'https://mangapill.com/manga/2/one-piece',
          status: MediaStatus.ONGOING,
          releaseDate: 1997,
        },
        {
          id: '3258/one-piece-digital-colored-comics',
          title: 'One Piece - Digital Colored Comics',
          image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/3258.jpeg',
          headerForImage: REFERER,
          url: 'https://mangapill.com/manga/3258/one-piece-digital-colored-comics',
          status: MediaStatus.ONGOING,
          releaseDate: 1997,
        },
        {
          id: '6290/one-piece-pirate-recipes',
          title: 'One Piece Pirate Recipes',
          altTitles: ["One Piece Pirate Recipes: Sanji's Gut-Stuffers"],
          image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/6290.png',
          headerForImage: REFERER,
          url: 'https://mangapill.com/manga/6290/one-piece-pirate-recipes',
          status: MediaStatus.COMPLETED,
          releaseDate: 2021,
        },
      ],
    });
  });

  it('keeps the alt title out of the title', async () => {
    const { results } = await mangaPill().provider.search('one piece');

    // The card's alt title sits next to its title; both used to be joined into one string.
    expect(results.map((result) => result.title)).not.toContainEqual(expect.stringContaining('Sanji'));
    expect(results[0]).not.toHaveProperty('altTitles');
  });

  it('asks for later pages and reports the last one', async () => {
    const { provider, get } = mangaPill();

    const search = await provider.search('one piece', 2);

    expect(get).toHaveBeenCalledWith('https://mangapill.com/search?q=one%20piece&page=2');
    expect(search.currentPage).toBe(2);
    expect(search.hasNextPage).toBe(false);
    expect(search.results.map((result) => result.id)).toEqual([
      '9908/saigo-ni-hitotsu-dake-onegai-shitemo-yoroshii-deshou-ka',
      '10149/kanojo-wo-dere-saseru-houhou-wo-shourai-kekkon-suru-ore-dake-ga-shitteiru',
    ]);
  });

  it('passes request failures on', async () => {
    const ctx = {
      ...createProviderContext(),
      axios: { get: jest.fn().mockRejectedValue(new Error('socket hang up')) },
    };

    await expect(new MangaPill(ctx as unknown as ProviderContext).search('one piece')).rejects.toThrow(
      'socket hang up'
    );
  });
});

describe('MangaPill fetchMangaInfo', () => {
  it('follows the manga contract', async () => {
    expectMangaInfo(await mangaPill().provider.fetchMangaInfo('2/one-piece'));
    expectMangaInfo(await mangaPill().provider.fetchMangaInfo('6290/one-piece-pirate-recipes'));
  });

  it('maps the details, leaving out what the site lacks', async () => {
    const { chapters, ...info } = await mangaPill().provider.fetchMangaInfo('2/one-piece');

    expect(info).toEqual({
      id: '2/one-piece',
      title: 'One Piece',
      image: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp?h=01971742-5d7f-7f32-8d2b-d038279f8a73',
      headerForImage: REFERER,
      description: expect.stringMatching(/^Gol D\. Roger, a man referred to as the "Pirate King,"/),
      status: MediaStatus.ONGOING,
      releaseDate: 1997,
      url: 'https://mangapill.com/manga/2/one-piece',
      genres: ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Shounen', 'Super Power'],
    });
    // Paragraphs stay apart; the HTML's indentation and line breaks inside them don't survive.
    expect(info.description).toContain('Great Age of Pirates begins.\n\nTwenty-two years later');
    expect(info.description).toMatch(/\n\n\[Written by MAL Rewrite\]$/);
    expect(chapters).toHaveLength(14);
  });

  it('lists chapters first chapter first, numbered, decimal chapters included', async () => {
    const { chapters } = await mangaPill().provider.fetchMangaInfo('2/one-piece');

    // The site lists them newest first.
    expect(chapters!.map((chapter) => chapter.chapterNumber)).toEqual([
      1, 2, 3, 1052, 1053, 1053.1, 1053.2, 1053.3, 1053.4, 1054, 1054.5, 1055, 1196, 1197,
    ]);
    expect(chapters![0]).toEqual({
      id: '2-10001000/one-piece-chapter-1',
      title: 'Chapter 1',
      chapterNumber: 1,
      url: 'https://mangapill.com/chapters/2-10001000/one-piece-chapter-1',
    });
    expect(chapters![10]).toEqual({
      id: '2-11054500/one-piece-chapter-1054.5',
      title: 'Chapter 1054.5',
      chapterNumber: 1054.5,
      url: 'https://mangapill.com/chapters/2-11054500/one-piece-chapter-1054.5',
    });
  });

  it('reads the alt title of a finished title', async () => {
    const info = await mangaPill().provider.fetchMangaInfo('6290/one-piece-pirate-recipes');

    expect(info.title).toBe('One Piece Pirate Recipes');
    expect(info.altTitles).toEqual(["One Piece Pirate Recipes: Sanji's Gut-Stuffers"]);
    expect(info.status).toBe(MediaStatus.COMPLETED);
    expect(info.releaseDate).toBe(2021);
    expect(info.chapters!.map((chapter) => chapter.title)).toEqual([
      'Chapter 1',
      'Chapter 2',
      'Chapter 3',
      'Chapter 4',
      'Chapter 5',
      'Chapter 6',
    ]);
  });

  it.each([
    ['publishing', MediaStatus.ONGOING],
    ['finished', MediaStatus.COMPLETED],
    ['on hiatus', MediaStatus.HIATUS],
    ['discontinued', MediaStatus.CANCELLED],
    ['not yet published', MediaStatus.NOT_YET_AIRED],
    ['a label the site adds later', MediaStatus.UNKNOWN],
  ])('maps the status "%s" to %s', async (label, status) => {
    const { provider } = mangaPill((_url, html) => html.replace('<div>publishing</div>', `<div>${label}</div>`));

    expect((await provider.fetchMangaInfo('2/one-piece')).status).toBe(status);
  });

  it('leaves out a synopsis, status, year and genres the page lacks', async () => {
    const { provider } = mangaPill((_url, html) =>
      html
        .replace(/<p class="text-sm text--secondary">[\s\S]*?<\/p>/, '')
        .replace(
          /<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">[\s\S]*?<div class="mb-3">\s*<label/,
          '<div class="mb-3"><label'
        )
        .replace(/<a class="text-sm mr-1 text-brand" href="\/search\?genre=[^"]*">[^<]*<\/a>/g, '')
    );

    const info = await provider.fetchMangaInfo('2/one-piece');

    for (const field of ['altTitles', 'description', 'status', 'releaseDate', 'genres', 'authors'])
      expect(info).not.toHaveProperty(field);
    expectMangaInfo(info);
  });
});

describe('MangaPill fetchChapterPages', () => {
  it('follows the manga contract', async () => {
    expectChapterPages(await mangaPill().provider.fetchChapterPages('2-11069000/one-piece-chapter-1069'));
  });

  it('numbers pages from 1, each with the Referer the CDN needs', async () => {
    const pages = await mangaPill().provider.fetchChapterPages('2-11069000/one-piece-chapter-1069');

    expect(pages).toEqual(
      [1, 2, 3].map((n) => ({
        img: `https://cdn.readdetectiveconan.com/file/mangap/2/11069000/${n}.jpeg?t=1740977722`,
        page: n,
        headerForImage: REFERER,
      }))
    );
  });
});
