import type { IMangaChapter } from '../models/types';
/**
 * The chapter number in a site's chapter label or URL slug: `Chapter 10.5: Title` → 10.5,
 * `Vol.2 Ch.15` → 15, `12` → 12, `chapter-7` → 7. Undefined when the text names no chapter
 * number (a volume number alone doesn't count).
 */
export declare function parseChapterNumber(text: string | undefined | null): number | undefined;
/** The volume number in a chapter label: `Vol.2 Ch.15` → 2, `Volume 3` → 3. */
export declare function parseVolumeNumber(text: string | undefined | null): number | undefined;
/**
 * Chapters in reading order: first chapter first. When every chapter has a `chapterNumber`, they
 * are sorted by volume (only if every chapter has one, since some sites restart chapter numbers
 * each volume), then chapter number, then release date; equal chapters (several scanlations or
 * languages) keep the provider's order. When some chapter has no number there is nothing reliable
 * to sort by, so the provider's order is returned: the provider must then list chapters first to
 * last itself.
 */
export declare function sortChaptersForReading<T extends IMangaChapter>(chapters: readonly T[]): T[];
//# sourceMappingURL=manga.d.ts.map