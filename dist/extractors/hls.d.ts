import type { IVideo } from '../models';
/**
 * The variant streams an HLS master playlist lists, one per `#EXT-X-STREAM-INF`, labelled by
 * their height (`1080p`).
 *
 * Empty when `playlist` is not a master, and when the master lists its audio as separate
 * renditions (`#EXT-X-MEDIA:TYPE=AUDIO` with a `URI`): its variants are then video only, and a
 * player given one plays without sound. Return the master alone then; the player picks the
 * quality and the audio language from it.
 */
export declare function hlsVariants(playlist: unknown, masterUrl: string): IVideo[];
//# sourceMappingURL=hls.d.ts.map