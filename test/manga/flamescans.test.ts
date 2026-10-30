import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);

const flame = new MANGA.FlameScans();

test('search returns results in the shared manga shape', async () => {
  const search = await flame.search('returners magic');
  expectMangaSearch(search);
  expect(search.results.map((result) => result.title)).toContain("A Returner's Magic Should Be Special");
});

test('fetchMangaInfo returns chapters in reading order', async () => {
  const { results } = await flame.search('returners magic');
  const info = await flame.fetchMangaInfo(results[0]!.id);
  expectMangaInfo(info);
  expect(info.chapters![0]!.chapterNumber).toBe(1);

  // The cover CDN needs no Referer, so info has no headerForImage.
  const cover = await fetch(info.image!);
  expect(cover.status).toBe(200);
  expect(cover.headers.get('content-type')).toMatch(/^image\//);
});

test('fetchChapterPages returns numbered pages the CDN serves without a Referer', async () => {
  const { results } = await flame.search('returners magic');
  const info = await flame.fetchMangaInfo(results[0]!.id);
  const pages = await flame.fetchChapterPages(info.chapters![0]!.id);
  expectChapterPages(pages);

  const image = await fetch(pages[0]!.img);
  expect(image.status).toBe(200);
  expect(image.headers.get('content-type')).toMatch(/^image\//);
});
