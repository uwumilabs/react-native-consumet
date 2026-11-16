import type { CheerioAPI } from 'cheerio';
import type { IAnimeResult, ISearch } from '../../models';
/** `url` asking for listing page `page`; page numbers below 1 ask for the first page. */
export declare function pageUrl(url: string, page: number): string;
/** Page numbers below 1 ask for the first page. */
export declare function clampPage(page: number): number;
/**
 * A listing page: its `results`, and the page numbers its `.pagination` links to. `page` is the
 * page that was asked for, for a listing short enough to have no pagination.
 */
export declare function cardPage($: CheerioAPI, results: IAnimeResult[], page: number): ISearch<IAnimeResult>;
/** The id of an episode: `<anime id>$episode$<the site's episode id>`. */
export declare function toEpisodeId(animeId: string, siteId: string): string;
/**
 * The site's own id in an episode id: the part after `$episode$`, without the `$sub`, `$dub`,
 * `$auto` or `$both` some older ids end in. Undefined when `id` has no `$episode$`.
 */
export declare function siteEpisodeId(id: string): string | undefined;
//# sourceMappingURL=hianime.d.ts.map