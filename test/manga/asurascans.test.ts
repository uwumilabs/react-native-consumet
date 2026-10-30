import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);

// run: LIVE_TESTS=1 npx jest test/manga/asurascans.test.ts

const asura = new MANGA.AsuraScans();
const SLUG = 'omniscient-readers-viewpoint';

test('search finds the title and follows the contract', async () => {
  const data = await asura.search('Omniscient Reader’s Viewpoint');
  expectMangaSearch(data);
  expect(data.results.map((result) => result.id)).toContain(SLUG);
});

test('search pages through results', async () => {
  const first = await asura.search('the');
  expect(first.hasNextPage).toBe(true);
  const second = await asura.search('the', 2);
  expectMangaSearch(second, 2);
  expect(second.currentPage).toBe(2);
  expect(second.results[0]!.id).not.toBe(first.results[0]!.id);
});

test('info lists chapters first to last and follows the contract', async () => {
  const info = await asura.fetchMangaInfo(SLUG);
  expectMangaInfo(info);
  expect(info.id).toBe(SLUG);
  expect(info.title).toBe('Omniscient Reader’s Viewpoint');
  expect(info.chapters![0]).toMatchObject({ id: `${SLUG}/chapter/0`, chapterNumber: 0 });
  expect(info.chapters![1]).toMatchObject({ id: `${SLUG}/chapter/1`, title: 'Chapter 1', chapterNumber: 1 });
  expect(info.chapters!.every((chapter) => !Number.isNaN(Date.parse(chapter.releaseDate!)))).toBe(true);
});

test('pages of a chapter follow the contract', async () => {
  const pages = await asura.fetchChapterPages(`${SLUG}/chapter/1`);
  expectChapterPages(pages);
  // The image CDN serves pages without a Referer, so none is set.
  expect(pages[0]!.headerForImage).toBeUndefined();
  expect(pages[0]!.img).toMatch(/^https:\/\/cdn\.asurascans\.com\//);
});

test('decimal chapters resolve', async () => {
  const info = await asura.fetchMangaInfo('solo-farming-in-the-tower');
  const half = info.chapters!.find((chapter) => chapter.chapterNumber === 100.5);
  expect(half?.id).toBe('solo-farming-in-the-tower/chapter/100.5');
  expectChapterPages(await asura.fetchChapterPages(half!.id));
});
