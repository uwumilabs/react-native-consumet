import type { IMangaChapter } from '../../models';
/**
 * `url` as an absolute URL on `baseUrl`'s site: protocol-relative URLs get `https:`, paths are
 * joined to `baseUrl`. Undefined when there is no URL or it has another scheme (`javascript:`,
 * `data:`). String-based, since Hermes' global URL is incomplete.
 */
export declare const absoluteUrl: (url: string | null | undefined, baseUrl: string) => string | undefined;
/** The headers of an image host that refuses requests without the site as Referer. */
export declare const refererHeaders: (baseUrl: string) => Record<string, string>;
/**
 * Plain text of a site's HTML: `<br>` breaks a line, a paragraph ends with a blank line, and
 * whitespace within a line collapses to one space. Undefined when no text is left.
 */
export declare const plainText: (html: string | null | undefined) => string | undefined;
/**
 * A site's timestamp as ISO 8601, or the site's text when it doesn't parse. Fractions of a second
 * past milliseconds (`.000000Z`) are cut first: Hermes' Date.parse refuses them.
 */
export declare const toIsoDate: (value: string | null | undefined) => string | undefined;
/** A chapter's title: its name, or `Chapter 12` when the site gives none, or `fallback` without a number. */
export declare const chapterTitle: (name: string | null | undefined, chapterNumber: number | undefined, fallback: string) => string;
/**
 * Chapters as every provider returns them, from a site's newest-first list: each id once (the
 * first listed), first chapter first, then sortChaptersForReading. That sort keeps the given order
 * when a chapter has no number, so the list must already run first to last.
 */
export declare const finishChapters: <T extends IMangaChapter>(newestFirst: readonly T[]) => T[];
//# sourceMappingURL=shared.d.ts.map