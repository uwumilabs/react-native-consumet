import type { MediaStatus } from '../../models';

// Checked in order: "Finished Airing" and "Not yet aired" also contain words of later statuses.
const STATUS_WORDS: Array<[keyof typeof MediaStatus, RegExp]> = [
  ['NOT_YET_AIRED', /not[\s_-]*yet|coming[\s_-]*soon|upcoming/],
  ['COMPLETED', /finish|complete/],
  ['HIATUS', /hiatus/],
  ['CANCELLED', /cancel|discontinu|dropped|axed/],
  ['ONGOING', /airing|releasing|ongoing|on[\s_-]*going|publishing/],
];

/**
 * The MediaStatus a site's status text means, e.g. "Currently Airing", "RELEASING", "On Hiatus".
 * Text no rule recognises is UNKNOWN; no text at all is undefined, so the field can be left out.
 *
 * Takes the enum because registry code gets it from its context (`ctx.enums.MediaStatus`): loaders
 * before 2.0.0 answer `require('react-native-consumet/models')` with an empty object.
 */
export function toMediaStatus(text: string | null | undefined, statuses: typeof MediaStatus): MediaStatus | undefined {
  const normalized = text?.trim().toLowerCase();
  if (!normalized) return undefined;
  const key = STATUS_WORDS.find(([, words]) => words.test(normalized))?.[0] ?? 'UNKNOWN';
  return statuses[key];
}
