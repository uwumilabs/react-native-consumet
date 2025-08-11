import type { AxiosInstance } from 'axios';
import type { CheerioAPI } from 'cheerio';
import type { PolyURL, PolyURLSearchParams } from '../utils/url-polyfill';
/**
 * ExtractorContext:
 * This context is injected into each extractor to provide core utilities.
 */
export interface ExtractorContext {
    axios: AxiosInstance;
    load: (html: string) => CheerioAPI;
    USER_AGENT?: string;
    URL: typeof PolyURL;
    URLSearchParams: typeof PolyURLSearchParams;
}
//# sourceMappingURL=extractor-context.d.ts.map