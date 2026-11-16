import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
export declare function StreamWish(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer?: string) => Promise<ISource>;
};
//# sourceMappingURL=streamwish.d.ts.map