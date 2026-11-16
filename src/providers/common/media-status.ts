import { MediaStatus } from '../../models';

// Checked in order: "Finished Airing" and "Not yet aired" also contain words of later statuses.
const STATUS_WORDS: Array<[MediaStatus, RegExp]> = [
  [MediaStatus.NOT_YET_AIRED, /not[\s_-]*yet|coming[\s_-]*soon|upcoming/],
  [MediaStatus.COMPLETED, /finish|complete/],
  [MediaStatus.HIATUS, /hiatus/],
  [MediaStatus.CANCELLED, /cancel|discontinu|dropped|axed/],
  [MediaStatus.ONGOING, /airing|releasing|ongoing|on[\s_-]*going|publishing/],
];

/**
 * The MediaStatus a site's status text means, e.g. "Currently Airing", "RELEASING", "On Hiatus".
 * Text no rule recognises is UNKNOWN; no text at all is undefined, so the field can be left out.
 */
export function toMediaStatus(text: string | null | undefined): MediaStatus | undefined {
  const normalized = text?.trim().toLowerCase();
  if (!normalized) return undefined;
  return STATUS_WORDS.find(([, words]) => words.test(normalized))?.[0] ?? MediaStatus.UNKNOWN;
}
