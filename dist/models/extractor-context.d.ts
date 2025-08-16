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
    PolyURL: typeof PolyURL;
    PolyURLSearchParams: typeof PolyURLSearchParams;
}
/**
 * Configuration options for creating a extractor context
 */
export interface ExtractorContextConfig {
    /**
     * Custom axios instance (optional) - if not provided, a default one is created
     */
    axios?: AxiosInstance;
    /**
     * Custom cheerio load function (optional) - defaults to cheerio.load
     */
    load?: (html: string) => CheerioAPI;
    /**
     * Custom user agent (optional) - defaults to a standard browser user agent
     */
    userAgent?: string;
    /**
     * Custom extractors (optional) - defaults to dynamic extractors
     */
    extractors?: any;
}
//# sourceMappingURL=extractor-context.d.ts.map