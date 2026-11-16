import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
export declare function Gofile(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL) => Promise<ISource>;
};
//# sourceMappingURL=gofile.d.ts.map