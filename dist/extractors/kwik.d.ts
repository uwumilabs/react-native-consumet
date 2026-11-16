import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
/** Kwik, AnimePahe's player. Its embed page is loaded through the NativeConsumet WebView. */
export declare function Kwik(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer: string) => Promise<ISource>;
};
//# sourceMappingURL=kwik.d.ts.map