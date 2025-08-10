import type { AxiosInstance } from 'axios';
import type { CheerioAPI } from 'cheerio';
/**
 * ExtractorContext:
 * This context is injected into each extractor to provide core utilities.
 */
export interface ExtractorContext {
    axios: AxiosInstance;
    load: (html: string) => CheerioAPI;
    USER_AGENT?: string;
    sharedUtils: {
        [key: string]: any;
    };
}
//# sourceMappingURL=extractor-context.d.ts.map