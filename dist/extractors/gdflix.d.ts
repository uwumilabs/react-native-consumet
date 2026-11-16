import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
export declare function GDFlix(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer?: string) => Promise<ISource>;
};
//# sourceMappingURL=gdflix.d.ts.map