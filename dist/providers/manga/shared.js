"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finishChapters = exports.chapterTitle = exports.toIsoDate = exports.plainText = exports.refererHeaders = exports.absoluteUrl = void 0;
const cheerio_1 = require("cheerio");
const manga_1 = require("../../utils/manga");
/**
 * `url` as an absolute URL on `baseUrl`'s site: protocol-relative URLs get `https:`, paths are
 * joined to `baseUrl`. Undefined when there is no URL or it has another scheme (`javascript:`,
 * `data:`). String-based, since Hermes' global URL is incomplete.
 */
const absoluteUrl = (url, baseUrl) => {
    const value = url?.trim();
    if (!value)
        return undefined;
    if (/^https?:\/\//i.test(value))
        return value;
    if (value.startsWith('//'))
        return `https:${value}`;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value))
        return undefined;
    return `${baseUrl}/${value.replace(/^\/+/, '')}`;
};
exports.absoluteUrl = absoluteUrl;
/** The headers of an image host that refuses requests without the site as Referer. */
const refererHeaders = (baseUrl) => ({ Referer: `${baseUrl}/` });
exports.refererHeaders = refererHeaders;
/**
 * Plain text of a site's HTML: `<br>` breaks a line, a paragraph ends with a blank line, and
 * whitespace within a line collapses to one space. Undefined when no text is left.
 */
const plainText = (html) => {
    if (!html)
        return undefined;
    const text = (0, cheerio_1.load)(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n\n'), null, false)
        .root()
        .text()
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return text || undefined;
};
exports.plainText = plainText;
/**
 * A site's timestamp as ISO 8601, or the site's text when it doesn't parse. Fractions of a second
 * past milliseconds (`.000000Z`) are cut first: Hermes' Date.parse refuses them.
 */
const toIsoDate = (value) => {
    const text = value?.trim();
    if (!text)
        return undefined;
    const time = Date.parse(text.replace(/(\.\d{3})\d+/, '$1'));
    return Number.isNaN(time) ? text : new Date(time).toISOString();
};
exports.toIsoDate = toIsoDate;
/** A chapter's title: its name, or `Chapter 12` when the site gives none, or `fallback` without a number. */
const chapterTitle = (name, chapterNumber, fallback) => name?.replace(/\s+/g, ' ').trim() || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : fallback);
exports.chapterTitle = chapterTitle;
/**
 * Chapters as every provider returns them, from a site's newest-first list: each id once (the
 * first listed), first chapter first, then sortChaptersForReading. That sort keeps the given order
 * when a chapter has no number, so the list must already run first to last.
 */
const finishChapters = (newestFirst) => {
    const seen = new Set();
    const unique = newestFirst.filter((chapter) => {
        if (seen.has(chapter.id))
            return false;
        seen.add(chapter.id);
        return true;
    });
    return (0, manga_1.sortChaptersForReading)(unique.reverse());
};
exports.finishChapters = finishChapters;
//# sourceMappingURL=shared.js.map