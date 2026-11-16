/**
 * The id of a page on a movie site: its path below `baseUrl`, without slashes around it
 * (`https://himovies.sx/tv/watch-vincenzo-67955` -> `tv/watch-vincenzo-67955`). Only the path
 * counts, so a custom base URL and links to the site's other domains give the same ids.
 */
export declare function pageId(url: string, baseUrl: string): string;
/** The URL of a page: `id` itself when it's a URL, else the page id below `baseUrl`. */
export declare function pageUrl(id: string, baseUrl: string): string;
/** A search query as the sites put it in their URLs: each run of characters other than letters and digits as `separator`. */
export declare function querySlug(query: string, separator: '-' | '+'): string;
//# sourceMappingURL=site-paths.d.ts.map