import type { MediaStatus } from '../../models';
/**
 * The MediaStatus a site's status text means, e.g. "Currently Airing", "RELEASING", "On Hiatus".
 * Text no rule recognises is UNKNOWN; no text at all is undefined, so the field can be left out.
 *
 * Takes the enum because registry code gets it from its context (`ctx.enums.MediaStatus`): loaders
 * before 2.0.0 answer `require('react-native-consumet/models')` with an empty object.
 */
export declare function toMediaStatus(text: string | null | undefined, statuses: typeof MediaStatus): MediaStatus | undefined;
//# sourceMappingURL=media-status.d.ts.map