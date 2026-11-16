import { type ExtractorContext, type ISource } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
/** FastDL's dl.php?link=<url> is an HTML "Download Now" page; the file is the URL it wraps. */
export declare const unwrapFastDlUrl: (url: string) => string;
export declare function HubCloud(ctx: ExtractorContext): {
    extract: (videoUrl: string | PolyURL, referer?: string) => Promise<ISource>;
};
//# sourceMappingURL=hubcloud.d.ts.map