import { expect } from '@jest/globals';

/**
 * The shape anime and movie providers return (and the meta providers that hand on their results):
 * a search page, info with episodes, an episode's servers and its sources. The live suites call
 * these on real responses, so every provider is held to the same rules. Each check collects every
 * problem before failing, so one run shows all of them.
 */

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isAbsoluteUrl = (value: unknown) => typeof value === 'string' && /^https?:\/\/[^\s]+$/.test(value);
const nonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const isHeaders = (value: unknown) =>
  isObject(value) && Object.values(value).every((header) => typeof header === 'string');
/** A title is a string, or an object of titles (AniList's romaji, english...) with at least one. */
const isTitle = (value: unknown) =>
  nonEmptyString(value) || (isObject(value) && Object.values(value).some((title) => nonEmptyString(title)));
const quote = (value: unknown): string => {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
};

/** Problems with a list that must hold at least one object, and with each of its objects. */
function listProblems(list: unknown, where: string, itemProblems: (item: Fields, where: string) => string[]) {
  if (!Array.isArray(list)) return [`${where} must be an array (${quote(list)})`];
  if (list.length === 0) return [`${where} must not be empty`];
  return list.flatMap((item, i) =>
    isObject(item) ? itemProblems(item, `${where}[${i}]`) : [`${where}[${i}] must be an object (${quote(item)})`]
  );
}

const isId = (value: unknown) => nonEmptyString(value);

function mediaProblems(media: Fields, where: string): string[] {
  const problems: string[] = [];
  if (!isId(media.id)) problems.push(`${where}: id must be a non-empty string (${quote(media.id)})`);
  if (!isTitle(media.title)) problems.push(`${where}: title must be a non-empty string or titles (${quote(media.title)})`);
  for (const field of ['url', 'image'] as const) {
    if (media[field] !== undefined && !isAbsoluteUrl(media[field]))
      problems.push(`${where}: ${field} must be an absolute URL (${quote(media[field])})`);
  }
  return problems;
}

/**
 * A search page for `page`: at least one result, each with an id and a title. When the provider
 * pages, `currentPage` is the page asked for and `hasNextPage` a boolean, and no result repeats an
 * id of `earlierIds` (the results of the pages before it).
 */
export function expectMediaSearch(search: unknown, page = 1, earlierIds: ReadonlySet<unknown> = new Set()): void {
  if (!isObject(search)) throw new Error(`search must return an object (${quote(search)})`);
  const problems = listProblems(search.results, 'results', mediaProblems);
  if (search.currentPage !== undefined && search.currentPage !== page)
    problems.push(`currentPage must be ${page}, the page asked for (got ${quote(search.currentPage)})`);
  if (search.hasNextPage !== undefined && typeof search.hasNextPage !== 'boolean')
    problems.push(`hasNextPage must be a boolean (${quote(search.hasNextPage)})`);
  const repeated = (Array.isArray(search.results) ? search.results : []).filter(
    (result) => isObject(result) && earlierIds.has(result.id)
  ).length;
  if (repeated > 0) problems.push(`${repeated} results repeat ids from earlier pages (is the page ignored?)`);
  expect(problems).toEqual([]);
}

/** Info for one title: an id and a title, and episodes that each have an id to play. */
export function expectMediaInfo(info: unknown): void {
  if (!isObject(info)) throw new Error(`info must be an object (${quote(info)})`);
  const problems = [
    ...mediaProblems(info, 'info'),
    ...listProblems(info.episodes, 'episodes', (episode, where) => {
      const found: string[] = [];
      if (!nonEmptyString(episode.id)) found.push(`${where}: id must be a non-empty string (${quote(episode.id)})`);
      for (const field of ['number', 'season'] as const) {
        const value = episode[field];
        if (value !== undefined && !(typeof value === 'number' && Number.isFinite(value)))
          found.push(`${where}: ${field} must be a finite number (${quote(value)})`);
      }
      if (episode.url !== undefined && !isAbsoluteUrl(episode.url))
        found.push(`${where}: url must be an absolute URL (${quote(episode.url)})`);
      return found;
    }),
  ];
  expect(problems).toEqual([]);
}

/** An episode's servers: at least one, each with a name and an absolute URL. */
export function expectServers(servers: unknown): void {
  const problems = listProblems(servers, 'servers', (server, where) => [
    ...(nonEmptyString(server.name) ? [] : [`${where}: name must be a non-empty string (${quote(server.name)})`]),
    ...(isAbsoluteUrl(server.url) ? [] : [`${where}: url must be an absolute URL (${quote(server.url)})`]),
  ]);
  expect(problems).toEqual([]);
}

/** An episode's sources: at least one absolute video URL; headers and subtitles in their shapes. */
export function expectSources(source: unknown): void {
  if (!isObject(source)) throw new Error(`sources must be an object (${quote(source)})`);
  const problems = listProblems(source.sources, 'sources', (video, where) => {
    const found: string[] = [];
    if (!isAbsoluteUrl(video.url)) found.push(`${where}: url must be an absolute URL (${quote(video.url)})`);
    if (video.isM3U8 !== undefined && typeof video.isM3U8 !== 'boolean')
      found.push(`${where}: isM3U8 must be a boolean (${quote(video.isM3U8)})`);
    if (video.quality !== undefined && !nonEmptyString(video.quality))
      found.push(`${where}: quality must be a non-empty string (${quote(video.quality)})`);
    return found;
  });
  if (source.headers !== undefined && !isHeaders(source.headers))
    problems.push(`headers must map header names to strings (${quote(source.headers)})`);
  if (source.subtitles !== undefined && !(Array.isArray(source.subtitles) && source.subtitles.length === 0))
    problems.push(
      ...listProblems(source.subtitles, 'subtitles', (subtitle, where) => [
        ...(isAbsoluteUrl(subtitle.url) ? [] : [`${where}: url must be an absolute URL (${quote(subtitle.url)})`]),
        ...(nonEmptyString(subtitle.lang) ? [] : [`${where}: lang must be a non-empty string (${quote(subtitle.lang)})`]),
      ])
    );
  expect(problems).toEqual([]);
}
