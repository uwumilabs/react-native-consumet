import { expect } from '@jest/globals';
import { MediaStatus, type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch } from '../../../src/models';

/**
 * The shape every manga provider returns, whatever its site looks like (docs/guides/manga.md).
 * Provider tests call these on recorded responses (offline) and live suites on real ones, so every
 * provider is held to the same rules.
 */

const isAbsoluteUrl = (value: unknown) => typeof value === 'string' && /^https?:\/\/[^\s]+$/.test(value);
const nonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const isHeaders = (value: unknown) =>
  value !== null &&
  typeof value === 'object' &&
  Object.values(value as object).every((header) => typeof header === 'string');
const STATUSES = Object.values(MediaStatus) as string[];

/** Problems with one result or info's common fields (empty when it follows the contract). */
function resultProblems(result: IMangaResult, where: string): string[] {
  const problems: string[] = [];
  if (!nonEmptyString(result.id)) problems.push(`${where}: id must be a non-empty string`);
  if (!nonEmptyString(result.title)) problems.push(`${where}: title must be a non-empty string`);
  if (result.image !== undefined && !isAbsoluteUrl(result.image))
    problems.push(`${where}: image must be an absolute URL (${result.image})`);
  if (result.url !== undefined && !isAbsoluteUrl(result.url))
    problems.push(`${where}: url must be an absolute URL (${result.url})`);
  if (result.headerForImage !== undefined && !isHeaders(result.headerForImage))
    problems.push(`${where}: headerForImage must map header names to strings`);
  if (
    result.altTitles !== undefined &&
    !(Array.isArray(result.altTitles) && result.altTitles.every((t) => nonEmptyString(t)))
  )
    problems.push(`${where}: altTitles must be an array of non-empty strings`);
  if (result.description !== undefined && typeof result.description !== 'string')
    problems.push(`${where}: description must be a string`);
  if (result.status !== undefined && !STATUSES.includes(result.status))
    problems.push(`${where}: status must be a MediaStatus (${result.status})`);
  return problems;
}

/** Search results: at least one, each with an id and a string title. */
export function expectMangaSearch(search: ISearch<IMangaResult>): void {
  expect(Array.isArray(search.results)).toBe(true);
  expect(search.results.length).toBeGreaterThan(0);
  expect(search.results.flatMap((result, i) => resultProblems(result, `results[${i}]`))).toEqual([]);
}

/** Title info: the common fields, plus chapters in reading order with string titles and numbers. */
export function expectMangaInfo(info: IMangaInfo): void {
  const problems = resultProblems(info, 'info');
  const chapters = info.chapters ?? [];
  if (chapters.length === 0) problems.push('info: chapters must not be empty');
  for (const field of ['genres', 'authors', 'artists'] as const) {
    const value = info[field];
    if (value !== undefined && !(Array.isArray(value) && value.every((v) => nonEmptyString(v))))
      problems.push(`info: ${field} must be an array of non-empty strings`);
  }
  chapters.forEach((chapter, i) => {
    const where = `chapters[${i}]`;
    if (!nonEmptyString(chapter.id)) problems.push(`${where}: id must be a non-empty string`);
    if (!nonEmptyString(chapter.title)) problems.push(`${where}: title must be a non-empty string`);
    for (const field of ['chapterNumber', 'volumeNumber', 'pages'] as const) {
      const value = chapter[field];
      if (value !== undefined && !(typeof value === 'number' && Number.isFinite(value)))
        problems.push(`${where}: ${field} must be a finite number (${String(value)})`);
    }
    if (chapter.releaseDate !== undefined && typeof chapter.releaseDate !== 'string')
      problems.push(`${where}: releaseDate must be a string`);
    if (chapter.url !== undefined && !isAbsoluteUrl(chapter.url))
      problems.push(`${where}: url must be an absolute URL (${chapter.url})`);
  });
  // Reading order: numbered chapters never go backwards (within a volume when every chapter has one).
  const numbered = chapters.filter((c) => typeof c.chapterNumber === 'number');
  const byVolume = chapters.length > 0 && chapters.every((c) => typeof c.volumeNumber === 'number');
  for (let i = 1; i < numbered.length; i++) {
    const [a, b] = [numbered[i - 1]!, numbered[i]!];
    const backwards = byVolume
      ? b.volumeNumber! < a.volumeNumber! || (b.volumeNumber === a.volumeNumber && b.chapterNumber! < a.chapterNumber!)
      : b.chapterNumber! < a.chapterNumber!;
    if (backwards) {
      problems.push(
        `chapters are not in reading order: chapter ${a.chapterNumber} is followed by ${b.chapterNumber}`
      );
      break;
    }
  }
  expect(problems).toEqual([]);
}

/** Chapter pages: at least one, absolute image URLs, numbered 1..n, headers on all pages or none. */
export function expectChapterPages(pages: IMangaChapterPage[]): void {
  const problems: string[] = [];
  if (!Array.isArray(pages) || pages.length === 0) problems.push('pages must not be empty');
  (pages ?? []).forEach((page, i) => {
    if (!isAbsoluteUrl(page.img)) problems.push(`pages[${i}]: img must be an absolute URL (${page.img})`);
    if (page.page !== i + 1) problems.push(`pages[${i}]: page must be ${i + 1} (got ${page.page})`);
    if (page.headerForImage !== undefined && !isHeaders(page.headerForImage))
      problems.push(`pages[${i}]: headerForImage must map header names to strings`);
  });
  const withHeaders = (pages ?? []).filter((page) => page.headerForImage !== undefined).length;
  if (withHeaders !== 0 && withHeaders !== (pages ?? []).length)
    problems.push('headerForImage must be on every page or on none');
  expect(problems).toEqual([]);
}
