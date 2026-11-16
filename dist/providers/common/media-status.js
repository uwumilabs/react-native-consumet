"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toMediaStatus = toMediaStatus;
// Checked in order: "Finished Airing" and "Not yet aired" also contain words of later statuses.
const STATUS_WORDS = [['NOT_YET_AIRED', /not[\s_-]*yet|coming[\s_-]*soon|upcoming/], ['COMPLETED', /finish|complete/], ['HIATUS', /hiatus/], ['CANCELLED', /cancel|discontinu|dropped|axed/], ['ONGOING', /airing|releasing|ongoing|on[\s_-]*going|publishing/]];
/**
 * The MediaStatus a site's status text means, e.g. "Currently Airing", "RELEASING", "On Hiatus".
 * Text no rule recognises is UNKNOWN; no text at all is undefined, so the field can be left out.
 *
 * Takes the enum because registry code gets it from its context (`ctx.enums.MediaStatus`): loaders
 * before 2.0.0 answer `require('react-native-consumet/models')` with an empty object.
 */
function toMediaStatus(text, statuses) {
  const normalized = text?.trim().toLowerCase();
  if (!normalized) return undefined;
  const key = STATUS_WORDS.find(_ref => {
    let [, words] = _ref;
    return words.test(normalized);
  })?.[0] ?? 'UNKNOWN';
  return statuses[key];
}
//# sourceMappingURL=media-status.js.map