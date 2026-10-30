import { parseChapterNumber, parseVolumeNumber, sortChaptersForReading } from '../../src/utils/manga';
import type { IMangaChapter } from '../../src/models';

describe('parseChapterNumber', () => {
  it.each([
    ['Chapter 12', 12],
    ['Ch. 10.5: The Return', 10.5],
    ['Vol.2 Ch.15', 15],
    ['chap 3', 3],
    ['Episode 7', 7],
    ['#41', 41],
    ['12', 12],
    ['10,5', 10.5],
    ['chapter-7', 7],
    ['solo-leveling-chapter-110', 110],
  ])('%s → %s', (text, number) => expect(parseChapterNumber(text)).toBe(number));

  it.each(['Volume 3', 'Witch 3', 'Oneshot', '', undefined, null])('%s has no chapter number', (text) =>
    expect(parseChapterNumber(text as any)).toBeUndefined()
  );
});

describe('parseVolumeNumber', () => {
  it.each([
    ['Vol.2 Ch.15', 2],
    ['Volume 3', 3],
    ['v4 c20', 4],
  ])('%s → %s', (text, number) => expect(parseVolumeNumber(text)).toBe(number));

  it.each(['Rev 2', 'Chapter 5', undefined])('%s has no volume number', (text) =>
    expect(parseVolumeNumber(text as any)).toBeUndefined()
  );
});

describe('sortChaptersForReading', () => {
  const chapter = (id: string, fields: Partial<IMangaChapter> = {}): IMangaChapter => ({ id, title: id, ...fields });

  it('puts the first chapter first, whatever order the site lists them in', () => {
    const newestFirst = [chapter('c3', { chapterNumber: 3 }), chapter('c2.5', { chapterNumber: 2.5 }), chapter('c1', { chapterNumber: 1 })];
    expect(sortChaptersForReading(newestFirst).map((c) => c.id)).toEqual(['c1', 'c2.5', 'c3']);
  });

  it('orders by volume first when every chapter has one (numbers restart each volume)', () => {
    const chapters = [
      chapter('v2c1', { volumeNumber: 2, chapterNumber: 1 }),
      chapter('v1c2', { volumeNumber: 1, chapterNumber: 2 }),
      chapter('v1c1', { volumeNumber: 1, chapterNumber: 1 }),
    ];
    expect(sortChaptersForReading(chapters).map((c) => c.id)).toEqual(['v1c1', 'v1c2', 'v2c1']);
  });

  it('keeps several versions of one chapter together, oldest release first, then in the given order', () => {
    const chapters = [
      chapter('b-en', { chapterNumber: 1, releaseDate: '2024-02-01' }),
      chapter('a-en', { chapterNumber: 1, releaseDate: '2024-01-01' }),
      chapter('x', { chapterNumber: 1 }),
      chapter('y', { chapterNumber: 1 }),
    ];
    expect(sortChaptersForReading(chapters).map((c) => c.id)).toEqual(['a-en', 'b-en', 'x', 'y']);
  });

  it("returns the provider's order when some chapter has no number", () => {
    const chapters = [chapter('prologue'), chapter('c2', { chapterNumber: 2 }), chapter('c1', { chapterNumber: 1 })];
    expect(sortChaptersForReading(chapters).map((c) => c.id)).toEqual(['prologue', 'c2', 'c1']);
  });

  it('does not change the list it is given', () => {
    const chapters = [chapter('c2', { chapterNumber: 2 }), chapter('c1', { chapterNumber: 1 })];
    sortChaptersForReading(chapters);
    expect(chapters.map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});
