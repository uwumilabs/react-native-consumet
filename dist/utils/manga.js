"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseChapterNumber = parseChapterNumber;
exports.parseVolumeNumber = parseVolumeNumber;
exports.sortChaptersForReading = sortChaptersForReading;
// "Chapter 12", "Ch. 10.5", "chap 3", "Episode 7", "#41"; the number that names the chapter.
// Word boundaries keep "Witch 3" or "Rev 2" from reading as a chapter or volume number.
const CHAPTER_NUMBER = /(?:\b(?:chapter|chap|ch|episode|ep)\.?|#)\s*(\d+(?:[.,]\d+)?)/i;
const VOLUME_NUMBER = /\b(?:volume|vol|v)\.?\s*(\d+(?:[.,]\d+)?)/i;
// Text that is only a number ("12", "10.5"), as some sites list chapters.
const BARE_NUMBER = /^\s*(\d+(?:[.,]\d+)?)\s*$/;
const toNumber = digits => {
  if (digits === undefined) return undefined;
  const value = Number(digits.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};
/**
 * The chapter number in a site's chapter label or URL slug: `Chapter 10.5: Title` → 10.5,
 * `Vol.2 Ch.15` → 15, `12` → 12, `chapter-7` → 7. Undefined when the text names no chapter
 * number (a volume number alone doesn't count).
 */
function parseChapterNumber(text) {
  if (!text) return undefined;
  const normalized = String(text).replace(/[-_]+/g, ' ');
  return toNumber(CHAPTER_NUMBER.exec(normalized)?.[1] ?? BARE_NUMBER.exec(normalized)?.[1]);
}
/** The volume number in a chapter label: `Vol.2 Ch.15` → 2, `Volume 3` → 3. */
function parseVolumeNumber(text) {
  if (!text) return undefined;
  return toNumber(VOLUME_NUMBER.exec(String(text).replace(/[-_]+/g, ' '))?.[1]);
}
/**
 * Chapters in reading order: first chapter first. When every chapter has a `chapterNumber`, they
 * are sorted by volume (only if every chapter has one, since some sites restart chapter numbers
 * each volume), then chapter number, then release date; equal chapters (several scanlations or
 * languages) keep the provider's order. When some chapter has no number there is nothing reliable
 * to sort by, so the provider's order is returned: the provider must then list chapters first to
 * last itself.
 */
function sortChaptersForReading(chapters) {
  if (!chapters.every(chapter => typeof chapter.chapterNumber === 'number')) return [...chapters];
  const byVolume = chapters.every(chapter => typeof chapter.volumeNumber === 'number');
  const time = chapter => {
    const value = chapter.releaseDate ? Date.parse(chapter.releaseDate) : NaN;
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
  };
  return chapters.map((chapter, index) => ({
    chapter,
    index
  })).sort((a, b) => (byVolume ? a.chapter.volumeNumber - b.chapter.volumeNumber : 0) || a.chapter.chapterNumber - b.chapter.chapterNumber || time(a.chapter) - time(b.chapter) || a.index - b.index).map(_ref => {
    let {
      chapter
    } = _ref;
    return chapter;
  });
}
//# sourceMappingURL=manga.js.map