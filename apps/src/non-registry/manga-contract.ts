/**
 * Contract checks for the Manga tab: plain-function copies of test/unit/helpers/manga-contract.ts
 * (which asserts with jest). Each returns the problems it finds in a response; an empty list means
 * it follows the shape every manga provider shares (docs/guides/manga.md). Keep the two in step.
 *
 * Responses are checked as `unknown`: a provider that breaks the shape must show up here, not crash
 * the check.
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

/** A value as it reads in a problem or on screen: strings as they are, anything else as JSON. */
export const show = (value: unknown): string =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));

/** Problems with one result or info's common fields. */
function resultProblems(result: unknown, where: string): string[] {
  if (!isObject(result)) return [`${where}: must be an object (${show(result)})`];
  const problems: string[] = [];
  if (!nonEmptyString(result.id)) problems.push(`${where}: id must be a non-empty string (${show(result.id)})`);
  if (!nonEmptyString(result.title))
    problems.push(`${where}: title must be a non-empty string (${show(result.title)})`);
  if (result.image !== undefined && !isAbsoluteUrl(result.image))
    problems.push(`${where}: image must be an absolute URL (${show(result.image)})`);
  if (result.url !== undefined && !isAbsoluteUrl(result.url))
    problems.push(`${where}: url must be an absolute URL (${show(result.url)})`);
  if (result.headerForImage !== undefined && !isHeaders(result.headerForImage))
    problems.push(`${where}: headerForImage must map header names to strings`);
  if (
    result.altTitles !== undefined &&
    !(Array.isArray(result.altTitles) && result.altTitles.every((t) => nonEmptyString(t)))
  )
    problems.push(`${where}: altTitles must be an array of non-empty strings`);
  if (result.description !== undefined && typeof result.description !== 'string')
    problems.push(`${where}: description must be a string`);
  if (result.status !== undefined && !STATUSES.includes(result.status as string))
    problems.push(`${where}: status must be a MediaStatus (${show(result.status)})`);
  return problems;
}

/** Search results: at least one, each with an id and a string title. */
export function searchProblems(search: unknown): string[] {
  if (!isObject(search)) return [`search must return an object (${show(search)})`];
  const { results } = search;
  if (!Array.isArray(results)) return [`results must be an array (${show(results)})`];
  const problems: string[] = [];
  if (results.length === 0) problems.push('results must not be empty (search a title the site has)');
  results.forEach((result, i) => problems.push(...resultProblems(result, `results[${i}]`)));
  return problems;
}

/** Title info: the common fields, plus chapters in reading order with string titles and numbers. */
export function infoProblems(info: unknown): string[] {
  if (!isObject(info)) return [`info must be an object (${show(info)})`];
  const problems = resultProblems(info, 'info');
  const chapters = info.chapters ?? [];
  if (!Array.isArray(chapters)) return [...problems, `info: chapters must be an array (${show(chapters)})`];
  if (chapters.length === 0) problems.push('info: chapters must not be empty');
  for (const field of ['genres', 'authors', 'artists'] as const) {
    const value = info[field];
    if (value !== undefined && !(Array.isArray(value) && value.every((v) => nonEmptyString(v))))
      problems.push(`info: ${field} must be an array of non-empty strings`);
  }
  chapters.forEach((chapter: unknown, i) => {
    const where = `chapters[${i}]`;
    if (!isObject(chapter)) {
      problems.push(`${where}: must be an object (${show(chapter)})`);
      return;
    }
    if (!nonEmptyString(chapter.id)) problems.push(`${where}: id must be a non-empty string (${show(chapter.id)})`);
    if (!nonEmptyString(chapter.title))
      problems.push(`${where}: title must be a non-empty string (${show(chapter.title)})`);
    for (const field of ['chapterNumber', 'volumeNumber', 'pages'] as const) {
      const value = chapter[field];
      if (value !== undefined && !isFiniteNumber(value))
        problems.push(`${where}: ${field} must be a finite number (${show(value)})`);
    }
    if (chapter.releaseDate !== undefined && typeof chapter.releaseDate !== 'string')
      problems.push(`${where}: releaseDate must be a string`);
    if (chapter.url !== undefined && !isAbsoluteUrl(chapter.url))
      problems.push(`${where}: url must be an absolute URL (${show(chapter.url)})`);
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
  if (!Array.isArray(pages)) return [`pages must be an array (${show(pages)})`];
  const problems: string[] = [];
  if (pages.length === 0) problems.push('pages must not be empty');
  pages.forEach((page: unknown, i) => {
    if (!isObject(page)) {
      problems.push(`pages[${i}]: must be an object (${show(page)})`);
      return;
    }
    if (!isAbsoluteUrl(page.img)) problems.push(`pages[${i}]: img must be an absolute URL (${show(page.img)})`);
    if (page.page !== i + 1) problems.push(`pages[${i}]: page must be ${i + 1} (got ${show(page.page)})`);
    if (page.headerForImage !== undefined && !isHeaders(page.headerForImage))
      problems.push(`pages[${i}]: headerForImage must map header names to strings`);
  });
  const withHeaders = pages.filter((page) => isObject(page) && page.headerForImage !== undefined).length;
  if (withHeaders !== 0 && withHeaders !== pages.length)
    problems.push('headerForImage must be on every page or on none');
  return problems;
}
