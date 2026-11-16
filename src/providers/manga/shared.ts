import { load } from 'cheerio';

import type { IMangaChapter } from '../../models';
import { sortChaptersForReading } from '../../utils/manga';

/**
 * `url` as an absolute URL on `baseUrl`'s site: protocol-relative URLs get `https:`, paths are
 * joined to `baseUrl`. Undefined when there is no URL or it has another scheme (`javascript:`,
 * `data:`). String-based, since Hermes' global URL is incomplete.
 */
export const absoluteUrl = (url: string | null | undefined, baseUrl: string): string | undefined => {
  const value = url?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return undefined;
  return `${baseUrl}/${value.replace(/^\/+/, '')}`;
};

/** The headers of an image host that refuses requests without the site as Referer. */
export const refererHeaders = (baseUrl: string): Record<string, string> => ({ Referer: `${baseUrl}/` });

/**
 * Plain text of a site's HTML: `<br>` breaks a line, a paragraph ends with a blank line, and
 * whitespace within a line collapses to one space. Undefined when no text is left.
 */
export const plainText = (html: string | null | undefined): string | undefined => {
  if (!html) return undefined;
  const text = load(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n\n'), null, false)
    .root()
    .text()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
};

/**
 * A site's timestamp as ISO 8601, or the site's text when it doesn't parse. Fractions of a second
 * past milliseconds (`.000000Z`) are cut first: Hermes' Date.parse refuses them.
 */
export const toIsoDate = (value: string | null | undefined): string | undefined => {
  const text = value?.trim();
  if (!text) return undefined;
  const time = Date.parse(text.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(time) ? text : new Date(time).toISOString();
};

/** A chapter's title: its name, or `Chapter 12` when the site gives none, or `fallback` without a number. */
export const chapterTitle = (
  name: string | null | undefined,
  chapterNumber: number | undefined,
  fallback: string
): string => name?.replace(/\s+/g, ' ').trim() || (chapterNumber !== undefined ? `Chapter ${chapterNumber}` : fallback);

/**
 * Chapters as every provider returns them, from a site's newest-first list: each id once (the
 * first listed), first chapter first, then sortChaptersForReading. That sort keeps the given order
 * when a chapter has no number, so the list must already run first to last.
 */
export const finishChapters = <T extends IMangaChapter>(newestFirst: readonly T[]): T[] => {
  const seen = new Set<string>();
  const unique = newestFirst.filter((chapter) => {
    if (seen.has(chapter.id)) return false;
    seen.add(chapter.id);
    return true;
  });
  return sortChaptersForReading(unique.reverse());
};
