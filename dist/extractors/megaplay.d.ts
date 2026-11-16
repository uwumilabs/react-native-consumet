import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
/** MegaPlay, AniKoto's player. */
export declare function MegaPlay(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer?: string) => Promise<ISource>;
};
//# sourceMappingURL=megaplay.d.ts.map