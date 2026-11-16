import { expect } from '@jest/globals';
import { infoProblems, pageProblems, searchProblems } from '../../contracts/manga';

/**
 * The manga contract (test/contracts/manga.ts) as jest assertions. Provider tests call these on
 * recorded responses (offline) and live suites on real ones, so every provider is held to the same
 * rules.
 */

/** Search results for `page`, none repeating `earlierIds` (the ids of the pages before it). */
export function expectMangaSearch(search: unknown, page = 1, earlierIds?: ReadonlySet<unknown>): void {
  expect(searchProblems(search, page, earlierIds)).toEqual([]);
}

/** Title info, with chapters in reading order. */
export function expectMangaInfo(info: unknown): void {
  expect(infoProblems(info)).toEqual([]);
}

/** Chapter pages, numbered from 1. */
export function expectChapterPages(pages: unknown): void {
  expect(pageProblems(pages)).toEqual([]);
}
