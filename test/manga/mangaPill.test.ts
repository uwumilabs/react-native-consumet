import axios from 'axios';
import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);

// Live: LIVE_TESTS=1 npx jest test/manga/mangaPill.test.ts

const mangaPill = new MANGA.MangaPill();
const REFERER = { Referer: 'https://mangapill.com/' };

test('search: returns titles that follow the manga contract', async () => {
  const data = await mangaPill.search('one piece');

  expectMangaSearch(data);
  expect(data.currentPage).toBe(1);
  expect(data.results).toContainEqual(expect.objectContaining({ id: '2/one-piece', title: 'One Piece' }));
});

test('search: pages through the results', async () => {
  const [first, second] = [await mangaPill.search('one piece'), await mangaPill.search('one piece', 2)];

  expectMangaSearch(second);
  expect(first.hasNextPage).toBe(true);
  expect(second.currentPage).toBe(2);
  expect(second.results.map((r) => r.id)).not.toContain(first.results[0]!.id);
});

test('fetchMangaInfo: returns details and chapters in reading order', async () => {
  const data = await mangaPill.fetchMangaInfo('2/one-piece');

  expectMangaInfo(data);
  expect(data.title).toBe('One Piece');
  expect(data.headerForImage).toEqual(REFERER);
  expect(data.chapters![0]).toMatchObject({ title: 'Chapter 1', chapterNumber: 1 });
  expect(data.chapters!.every((chapter) => typeof chapter.chapterNumber === 'number')).toBe(true);
});

test('fetchChapterPages: returns pages from 1 with the Referer the image CDN needs', async () => {
  const data = await mangaPill.fetchChapterPages('2-11069000/one-piece-chapter-1069');

  expectChapterPages(data);
  expect(data[0]!.headerForImage).toEqual(REFERER);
  // The CDN serves the image with these headers (and 403s without them).
  const image = await axios.get(data[0]!.img, { headers: data[0]!.headerForImage, responseType: 'arraybuffer' });
  expect(image.headers['content-type']).toMatch(/^image\//);
});
