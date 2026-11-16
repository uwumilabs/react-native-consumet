import axios, { type AxiosInstance } from 'axios';
import { type CheerioAPI } from 'cheerio';
import type { ExtractorContext } from '../models';
export interface ExtractorContextConfig {
    /** HTTP client for every request; defaults to `defaultAxios` */
    axios?: AxiosInstance;
    /** Defaults to cheerio's `load` */
    load?: (html: string) => CheerioAPI;
    /** `USER_AGENT` of the context; defaults to the library's. Doesn't change the headers of `axios`. */
    userAgent?: string;
}
/** The HTTP client contexts use unless the app passes its own: a 15 s timeout and browser-like headers. */
export declare const defaultAxios: axios.AxiosInstance;
export declare function createExtractorContext(config?: ExtractorContextConfig): ExtractorContext;
/** `createExtractorContext()`: the library's axios, cheerio and user agent. */
export declare const defaultExtractorContext: ExtractorContext;
export default createExtractorContext;
//# sourceMappingURL=create-extractor-context.d.ts.map