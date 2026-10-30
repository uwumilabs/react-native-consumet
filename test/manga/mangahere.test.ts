import axios from 'axios';

import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);

const mangahere = new MANGA.MangaHere();

test('search returns manga that follow the contract', async () => {
  const data = await mangahere.search('slime');
  expectMangaSearch(data);
  expect(data.results[0]!.headerForImage).toEqual({ Referer: 'https://www.mangahere.cc/' });
});

test('search finds a title by a query with spaces', async () => {
  const data = await mangahere.search('tomodachi game');
  expectMangaSearch(data);
  expect(data.results.map((result) => result.id)).toContain('tomodachi_game');
});

test('fetchMangaInfo lists chapters first to last, with numbers and ISO dates', async () => {
  const info = await mangahere.fetchMangaInfo('tomodachi_game');
  expectMangaInfo(info);
  expect(info.title).toBe('Tomodachi Game');
  const first = info.chapters![0]!;
  expect(first).toMatchObject({ id: 'tomodachi_game/c001', chapterNumber: 1, releaseDate: '2014-09-22' });
  expect(first.title).toMatch(/^Ch\.001/);
});

test('fetchMangaInfo reads volume numbers', async () => {
  const info = await mangahere.fetchMangaInfo('kingdom');
  expectMangaInfo(info);
  expect(info.chapters![0]).toMatchObject({ id: 'kingdom/v01/c001', chapterNumber: 1, volumeNumber: 1 });
  expect(info.chapters!.every((chapter) => typeof chapter.volumeNumber === 'number')).toBe(true);
});

test('fetchChapterPages decodes the page-by-page reader', async () => {
  const pages = await mangahere.fetchChapterPages('kingdom/v46/c500.5');
  expectChapterPages(pages);
  expect(pages).toHaveLength(3);
  expect(pages[0]!.headerForImage).toEqual({ Referer: 'https://www.mangahere.cc/' });
});

test('fetchChapterPages decodes the long-strip reader', async () => {
  const pages = await mangahere.fetchChapterPages('start_by_signing_in_and_obtaining_the_ancient_divine_body/c176');
  expectChapterPages(pages);
  expect(pages.length).toBeGreaterThan(10);
});

test('covers and page images load with the headerForImage they carry, and not without', async () => {
  const [page] = await mangahere.fetchChapterPages('kingdom/v46/c500.5');
  const info = await mangahere.fetchMangaInfo('tomodachi_game');
  for (const [url, headers] of [
    [page!.img, page!.headerForImage],
    [info.image!, info.headerForImage],
  ] as const) {
    const image = await axios.get(url, { headers, responseType: 'arraybuffer' });
    expect(image.headers['content-type']).toMatch(/^image\//);
    const refused = await axios.get(url, { responseType: 'arraybuffer', validateStatus: () => true });
    expect(refused.status).toBe(403);
  }
});
