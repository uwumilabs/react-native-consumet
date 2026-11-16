import type { CheerioAPI } from 'cheerio';
import type { IAnimeResult, ISearch } from '../../models';
import { emptySearch } from '../common/search';

// Helpers for the hianime-style sites (Zoro, AniKoto): listing pages of anime cards with a
// Bootstrap `.pagination` whose links end in `page=N`, and episode ids of the form
// `<anime id>$episode$<the site's episode id>`.

/**
 * The zone the sites' schedules give airing times in: UTC+5:30 (IST), as minutes behind UTC (the
 * form Date.getTimezoneOffset uses). It is fixed, not the device's zone.
 */
export const IST_TZ_OFFSET = -330;

/** `url` asking for listing page `page`; page numbers below 1 ask for the first page. */
export function pageUrl(url: string, page: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}page=${clampPage(page)}`;
}

/** Page numbers below 1 ask for the first page. */
function clampPage(page: number): number {
  return page < 1 ? 1 : page;
}

/** The page number a pagination link asks for (`…?page=3`); NaN for none. */
const pageIn = (href: string | undefined): number => Number(href?.match(/[?&]page=(\d+)/)?.[1]);

/**
 * A listing page: its `results`, and the page numbers its `.pagination` links to. `page` is the
 * page that was asked for, for a listing short enough to have no pagination.
 */
export function cardPage($: CheerioAPI, results: IAnimeResult[], page: number): ISearch<IAnimeResult> {
  if (!results.length) return emptySearch(clampPage(page));
  const currentPage = parseInt($('.pagination .page-item.active').first().text().trim(), 10) || clampPage(page);
  const linkedPages = $('.pagination a[href]')
    .toArray()
    .map((link) => pageIn($(link).attr('href')))
    .filter((linked) => linked > 0);
  const totalPages = Math.max(currentPage, ...linkedPages);
  return { currentPage, hasNextPage: totalPages > currentPage, totalPages, results };
}

/** The genres a page links to (`/genre/<slug>`), by name, each once, in page order. */
export function linkedGenres($: CheerioAPI): string[] {
  const genres: string[] = [];
  $('a[href*="/genre/"]').each((_, link) => {
    const genre = $(link).text().trim();
    if (genre && !genres.includes(genre)) genres.push(genre);
  });
  return genres;
}

const EPISODE = '$episode$';

/** The id of an episode: `<anime id>$episode$<the site's episode id>`. */
export function toEpisodeId(animeId: string, siteId: string): string {
  return `${animeId}${EPISODE}${siteId}`;
}

/**
 * The site's own id in an episode id: the part after `$episode$`, without the `$sub`, `$dub`,
 * `$auto` or `$both` some older ids end in. Undefined when `id` has no `$episode$`.
 */
export function siteEpisodeId(id: string): string | undefined {
  if (!id.includes(EPISODE)) return undefined;
  return id.split(EPISODE)[1]!.replace(/\$(sub|dub|auto|both)$/i, '');
}
