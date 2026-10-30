import axios from 'axios';
import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);

const mangakakalot = new MANGA.MangaKakalot();
const REFERER = { Referer: 'https://www.kakamanga.com/' };

/** HTTP status of an image request, with or without the headers a result says it needs. */
const imageStatus = (url: string, headers?: Record<string, string>) =>
  axios.get(url, { headers, responseType: 'arraybuffer', validateStatus: () => true }).then((r) => r.status);

test('search returns titles with covers that need the site as Referer', async () => {
  const data = await mangakakalot.search('Tomodachi Game');

  expectMangaSearch(data);
  expect(data.currentPage).toBe(1);
  expect(data.hasNextPage).toBe(true);
  expect(data.results[0]).toMatchObject({ id: 'tomodachi-game', title: 'Tomodachi Game', headerForImage: REFERER });
});

test('search pages through results', async () => {
  const data = await mangakakalot.search('Tomodachi Game', 2);

  expectMangaSearch(data, 2);
  expect(data.currentPage).toBe(2);
});

test('fetchMangaInfo returns every chapter in reading order', async () => {
  const info = await mangakakalot.fetchMangaInfo('tomodachi-game');

  expectMangaInfo(info);
  expect(info).toMatchObject({ title: 'Tomodachi Game', authors: ['Yamaguchi Mikoto'], headerForImage: REFERER });
  // The chapter-list API pages 50 at a time on the site; the provider must collect them all.
  expect(info.chapters!.length).toBeGreaterThan(130);
  expect(info.chapters![0]).toMatchObject({ id: 'tomodachi-game/chapter-0', chapterNumber: 0 });
  expect(info.chapters!.every((chapter) => typeof chapter.chapterNumber === 'number')).toBe(true);
  expect(info.chapters![0]!.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('fetchMangaInfo collects series longer than one API page', async () => {
  const info = await mangakakalot.fetchMangaInfo('one-piece');

  expectMangaInfo(info);
  expect(info.chapters!.length).toBeGreaterThan(1000);
});

test('fetchChapterPages returns pages from 1 with the Referer the image host needs', async () => {
  const pages = await mangakakalot.fetchChapterPages('tomodachi-game/chapter-127-5');

  expectChapterPages(pages);
  expect(pages[0]).toMatchObject({ page: 1, headerForImage: REFERER });
  expect(pages[0]!.img).toMatch(/^https:\/\/[^/]+\.2xstorage\.com\/tomodachi-game\/127\.5\/0\.webp$/);
});

test('the image host refuses pages and covers without headerForImage', async () => {
  const [page] = await mangakakalot.fetchChapterPages('tomodachi-game/chapter-127-5');
  const [cover] = (await mangakakalot.search('Tomodachi Game')).results;

  for (const { img, headers } of [
    { img: page!.img, headers: page!.headerForImage },
    { img: cover!.image!, headers: cover!.headerForImage as Record<string, string> },
  ]) {
    expect(await imageStatus(img)).toBe(403);
    expect(await imageStatus(img, headers)).toBe(200);
  }
});
