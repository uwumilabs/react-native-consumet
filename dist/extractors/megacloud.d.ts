import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
/**
 * MegaCloud, the player of HiAnime and HiMovies.
 * Thanks to https://github.com/yogesh-hacker for the original implementation.
 */
export declare function MegaCloud(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer: string) => Promise<ISource>;
};
//# sourceMappingURL=megacloud.d.ts.map