"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageUrl = pageUrl;
exports.clampPage = clampPage;
exports.cardPage = cardPage;
exports.toEpisodeId = toEpisodeId;
exports.siteEpisodeId = siteEpisodeId;
const search_1 = require("../common/search");
// Helpers for the hianime-style sites (Zoro, AniKoto): listing pages of anime cards with a
// Bootstrap `.pagination` whose links end in `page=N`, and episode ids of the form
// `<anime id>$episode$<the site's episode id>`.
/** `url` asking for listing page `page`; page numbers below 1 ask for the first page. */
function pageUrl(url, page) {
    return `${url}${url.includes('?') ? '&' : '?'}page=${clampPage(page)}`;
}
/** Page numbers below 1 ask for the first page. */
function clampPage(page) {
    return page < 1 ? 1 : page;
}
/** The page number a pagination link asks for (`…?page=3`); NaN for none. */
const pageIn = (href) => Number(href?.match(/[?&]page=(\d+)/)?.[1]);
/**
 * A listing page: its `results`, and the page numbers its `.pagination` links to. `page` is the
 * page that was asked for, for a listing short enough to have no pagination.
 */
function cardPage($, results, page) {
    if (!results.length)
        return (0, search_1.emptySearch)(clampPage(page));
    const currentPage = parseInt($('.pagination .page-item.active').first().text().trim(), 10) || clampPage(page);
    const linkedPages = $('.pagination a[href]')
        .toArray()
        .map((link) => pageIn($(link).attr('href')))
        .filter((linked) => linked > 0);
    const totalPages = Math.max(currentPage, ...linkedPages);
    return { currentPage, hasNextPage: totalPages > currentPage, totalPages, results };
}
const EPISODE = '$episode$';
/** The id of an episode: `<anime id>$episode$<the site's episode id>`. */
function toEpisodeId(animeId, siteId) {
    return `${animeId}${EPISODE}${siteId}`;
}
/**
 * The site's own id in an episode id: the part after `$episode$`, without the `$sub`, `$dub`,
 * `$auto` or `$both` some older ids end in. Undefined when `id` has no `$episode$`.
 */
function siteEpisodeId(id) {
    if (!id.includes(EPISODE))
        return undefined;
    return id.split(EPISODE)[1].replace(/\$(sub|dub|auto|both)$/i, '');
}
//# sourceMappingURL=hianime.js.map