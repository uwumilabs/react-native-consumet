/**
 * Contract checks for the Manga tab: plain-function copies of test/unit/helpers/manga-contract.ts
 * (which asserts with jest). Each returns the problems it finds in a response; an empty list means
 * it follows the shape every manga provider shares (docs/guides/manga.md). Keep the two in step.
 *
 * Responses are checked as `unknown`: a provider that breaks the shape must show up here, not crash
 * the check. Checks marked "app only" aren't in the unit helper: the paging that "load more" relies
 * on, and the plain-text description the doc asks for.
 */

import { MediaStatus } from 'react-native-consumet';

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isAbsoluteUrl = (value: unknown) => typeof value === 'string' && /^https?:\/\/[^\s]+$/.test(value);
const nonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const isHeaders = (value: unknown) =>
  value !== null &&
  typeof value === 'object' &&
  Object.values(value as object).every((header) => typeof header === 'string');
const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const STATUSES = Object.values(MediaStatus) as string[];
// Markup a plain-text description shouldn't carry (`<p>`, `<br/>`, `&amp;`, `&#39;`), as in
// test/unit/helpers/manga-contract.ts. Only real tags count, so a title in angle brackets
// ("<Myst, Might, Mayhem>", "<I Am the King>") is fine.
const HTML_TAG =
  /<\/?(?:a|b|blockquote|br|div|em|font|h[1-6]|hr|i|img|li|ol|p|span|strong|sub|sup|u|ul)(?:\s+[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))*\s*\/?>/i;
const HTML_ENTITY = /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i;

/** A value as it reads in a problem or on screen: strings as they are, anything else as JSON. */
export const show = (value: unknown): string =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
/** A value as it reads in a problem: JSON, so `"12"` (a string) and `12` (a number) look different. */
const quote = (value: unknown): string => {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
};

/** Problems with one result or info's common fields. */
function resultProblems(result: unknown, where: string): string[] {
  if (!isObject(result)) return [`${where}: must be an object (${quote(result)})`];
  const problems: string[] = [];
  if (!nonEmptyString(result.id)) problems.push(`${where}: id must be a non-empty string (${quote(result.id)})`);
  if (!nonEmptyString(result.title))
    problems.push(`${where}: title must be a non-empty string (${quote(result.title)})`);
  if (result.image !== undefined && !isAbsoluteUrl(result.image))
    problems.push(`${where}: image must be an absolute URL (${quote(result.image)})`);
  if (result.url !== undefined && !isAbsoluteUrl(result.url))
    problems.push(`${where}: url must be an absolute URL (${quote(result.url)})`);
  if (result.headerForImage !== undefined && !isHeaders(result.headerForImage))
    problems.push(`${where}: headerForImage must map header names to strings`);
  if (
    result.altTitles !== undefined &&
    !(Array.isArray(result.altTitles) && result.altTitles.every((t) => nonEmptyString(t)))
  )
    problems.push(`${where}: altTitles must be an array of non-empty strings`);
  if (result.description !== undefined && typeof result.description !== 'string')
    problems.push(`${where}: description must be a string`);
  const markup =
    typeof result.description === 'string' &&
    (HTML_TAG.exec(result.description) ?? HTML_ENTITY.exec(result.description))?.[0];
  if (markup) problems.push(`${where}: description must be plain text (found ${markup})`);
  if (result.status !== undefined && !STATUSES.includes(result.status as string))
    problems.push(`${where}: status must be a MediaStatus (${quote(result.status)})`);
  return problems;
}

/**
 * Search results: at least one, each with an id and a string title.
 * @param page the page that was asked for
 * @param earlierIds ids from the pages before it, when this is a later page
 */
export function searchProblems(search: unknown, page = 1, earlierIds: ReadonlySet<unknown> = new Set()): string[] {
  if (!isObject(search)) return [`search must return an object (${quote(search)})`];
  const { results, currentPage, hasNextPage } = search;
  if (!Array.isArray(results)) return [`results must be an array (${quote(results)})`];
  const problems: string[] = [];
  if (results.length === 0) problems.push('results must not be empty (search a title the site has)');
  results.forEach((result, i) => problems.push(...resultProblems(result, `results[${i}]`)));
  // The paging "load more" relies on.
  if (currentPage !== undefined && currentPage !== page)
    problems.push(`currentPage must be ${page}, the page asked for (got ${quote(currentPage)})`);
  if (hasNextPage !== undefined && typeof hasNextPage !== 'boolean')
    problems.push(`hasNextPage must be a boolean (${quote(hasNextPage)})`);
  // App only: needs the ids of the pages before this one.
  const repeated = results.filter((result) => isObject(result) && earlierIds.has(result.id)).length;
  if (repeated > 0)
    problems.push(`${repeated} of ${results.length} results repeat ids from earlier pages (is the page ignored?)`);
  return problems;
}

/** Title info: the common fields, plus chapters in reading order with string titles and numbers. */
export function infoProblems(info: unknown): string[] {
  if (!isObject(info)) return [`info must be an object (${quote(info)})`];
  const problems = resultProblems(info, 'info');
  const chapters = info.chapters ?? [];
  if (!Array.isArray(chapters)) return [...problems, `info: chapters must be an array (${quote(chapters)})`];
  if (chapters.length === 0) problems.push('info: chapters must not be empty');
  for (const field of ['genres', 'authors', 'artists'] as const) {
    const value = info[field];
    if (value !== undefined && !(Array.isArray(value) && value.every((v) => nonEmptyString(v))))
      problems.push(`info: ${field} must be an array of non-empty strings`);
  }
  chapters.forEach((chapter: unknown, i) => {
    const where = `chapters[${i}]`;
    if (!isObject(chapter)) {
      problems.push(`${where}: must be an object (${quote(chapter)})`);
      return;
    }
    if (!nonEmptyString(chapter.id)) problems.push(`${where}: id must be a non-empty string (${quote(chapter.id)})`);
    if (!nonEmptyString(chapter.title))
      problems.push(`${where}: title must be a non-empty string (${quote(chapter.title)})`);
    for (const field of ['chapterNumber', 'volumeNumber', 'pages'] as const) {
      const value = chapter[field];
      if (value !== undefined && !isFiniteNumber(value))
        problems.push(`${where}: ${field} must be a finite number (${quote(value)})`);
    }
    if (chapter.releaseDate !== undefined && typeof chapter.releaseDate !== 'string')
      problems.push(`${where}: releaseDate must be a string`);
    if (chapter.url !== undefined && !isAbsoluteUrl(chapter.url))
      problems.push(`${where}: url must be an absolute URL (${quote(chapter.url)})`);
  });
  // Reading order: numbered chapters never go backwards (within a volume when every chapter has one).
  const list = chapters.filter(isObject);
  const numbered = list.filter((c) => typeof c.chapterNumber === 'number') as {
    chapterNumber: number;
    volumeNumber?: number;
  }[];
  const byVolume = list.length > 0 && list.every((c) => typeof c.volumeNumber === 'number');
  for (let i = 1; i < numbered.length; i++) {
    const [a, b] = [numbered[i - 1]!, numbered[i]!];
    const backwards = byVolume
      ? b.volumeNumber! < a.volumeNumber! || (b.volumeNumber === a.volumeNumber && b.chapterNumber < a.chapterNumber)
      : b.chapterNumber < a.chapterNumber;
    if (backwards) {
      problems.push(`chapters are not in reading order: chapter ${a.chapterNumber} is followed by ${b.chapterNumber}`);
      break;
    }
  }
  return problems;
}

/** Chapter pages: at least one, absolute image URLs, numbered 1..n, headers on all pages or none. */
export function pageProblems(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [`pages must be an array (${quote(pages)})`];
  const problems: string[] = [];
  if (pages.length === 0) problems.push('pages must not be empty');
  pages.forEach((page: unknown, i) => {
    if (!isObject(page)) {
      problems.push(`pages[${i}]: must be an object (${quote(page)})`);
      return;
    }
    if (!isAbsoluteUrl(page.img)) problems.push(`pages[${i}]: img must be an absolute URL (${quote(page.img)})`);
    if (page.page !== i + 1) problems.push(`pages[${i}]: page must be ${i + 1} (got ${quote(page.page)})`);
    if (page.headerForImage !== undefined && !isHeaders(page.headerForImage))
      problems.push(`pages[${i}]: headerForImage must map header names to strings`);
  });
  const withHeaders = pages.filter((page) => isObject(page) && page.headerForImage !== undefined).length;
  if (withHeaders !== 0 && withHeaders !== pages.length)
    problems.push('headerForImage must be on every page or on none');
  return problems;
}
