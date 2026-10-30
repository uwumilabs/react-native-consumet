import { MANGA } from '../../src/providers';
import { expectChapterPages, expectMangaInfo, expectMangaSearch } from '../unit/helpers/manga-contract';

jest.setTimeout(120000);
// The API is reliable, but connections sometimes reset on the way.
jest.retryTimes(2);

const mangadex = new MANGA.MangaDex();

const MIERUKO_CHAN = '6670ee28-f26d-4b61-b49c-d71149cd5a6e';
// Over 500 English chapters, so the feed takes more than one request.
const IRUMA_KUN = 'd7037b2a-874a-4360-8a7b-07f2899152fd';

test('search returns titles in the shared shape', async () => {
  const data = await mangadex.search('Mieruko-chan');

  expectMangaSearch(data);
  const mieruko = data.results.find((result) => result.id === MIERUKO_CHAN);
  expect(mieruko).toMatchObject({ title: 'Mieruko-chan', url: `https://mangadex.org/title/${MIERUKO_CHAN}` });
  expect(mieruko?.image).toMatch(/^https:\/\/uploads\.mangadex\.org\/covers\/.+\.512\.jpg$/);
});

test('fetchMangaInfo returns English chapters in reading order, and fetchChapterPages their pages', async () => {
  const info = await mangadex.fetchMangaInfo(MIERUKO_CHAN);

  expectMangaInfo(info);
  expect(info).toMatchObject({ id: MIERUKO_CHAN, title: 'Mieruko-chan', status: 'Ongoing' });
  expect(info.authors).toContain('Izumi Tomoki');
  expect(info.genres).toContain('Horror');
  const chapters = info.chapters!;
  expect(chapters.length).toBeGreaterThan(90);
  expect(chapters.every((chapter) => chapter.language === 'en')).toBe(true);
  expect(chapters[0]).toMatchObject({ chapterNumber: 1, volumeNumber: 1 });
  expect(chapters.filter((chapter) => chapter.scanlator).length).toBeGreaterThan(chapters.length / 2);

  const pages = await mangadex.fetchChapterPages(chapters[0]!.id);
  expectChapterPages(pages);
  expect(pages.length).toBe(chapters[0]!.pages);
});

test('fetchMangaInfo reads every page of a long chapter feed', async () => {
  const info = await mangadex.fetchMangaInfo(IRUMA_KUN);

  expectMangaInfo(info);
  expect(info.chapters!.length).toBeGreaterThan(500);
  expect(new Set(info.chapters!.map((chapter) => chapter.id)).size).toBe(info.chapters!.length);
});

test('fetchMangaInfo lists chapters in another language', async () => {
  const info = await mangadex.fetchMangaInfo(MIERUKO_CHAN, 'pt-br');

  expectMangaInfo(info);
  expect(info.chapters!.every((chapter) => chapter.language === 'pt-br')).toBe(true);
});

test('the list methods return titles in the shared shape', async () => {
  for (const list of [
    await mangadex.fetchPopular(),
    await mangadex.fetchLatestUpdates(),
    await mangadex.fetchRecentlyAdded(),
    await mangadex.fetchRandom(),
  ]) {
    expectMangaSearch(list);
  }
});
