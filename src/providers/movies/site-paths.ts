/** The path of a URL, without its origin, query or fragment. */
const pathOf = (url: string): string => url.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '');

/**
 * The id of a page on a movie site: its path below `baseUrl`, without slashes around it
 * (`https://himovies.sx/tv/watch-vincenzo-67955` -> `tv/watch-vincenzo-67955`). Only the path
 * counts, so a custom base URL and links to the site's other domains give the same ids.
 */
export function pageId(url: string, baseUrl: string): string {
  const path = pathOf(url);
  const basePath = pathOf(baseUrl).replace(/\/+$/, '');
  const relative = basePath && path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
  return relative.replace(/^\/+|\/+$/g, '');
}

/** The URL of a page: `id` itself when it's a URL, else the page id below `baseUrl`. */
export function pageUrl(id: string, baseUrl: string): string {
  return /^https?:\/\//i.test(id) ? id : `${baseUrl}/${id.replace(/^\/+/, '')}`;
}

/** A search query as the sites put it in their URLs: each run of characters other than letters and digits as `separator`. */
export function querySlug(query: string, separator: '-' | '+'): string {
  return query.replace(/[\W_]+/g, separator);
}
