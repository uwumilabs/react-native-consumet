import type { ExtractorContext } from '../models';
/**
 * Configuration options for creating a provider context
 */
export interface ExtractorContextConfig {
    /**
     * Custom axios instance (optional) - if not provided, a default one is created
     */
    axios?: any;
    /**
     * Custom cheerio load function (optional) - defaults to cheerio.load
     */
    load?: (html: string) => any;
    /**
     * Custom user agent (optional) - defaults to a standard browser user agent
     */
    userAgent?: string;
    /**
     * Custom extractors (optional) - defaults to dynamic extractors
     */
    extractors?: any;
}
/**
 * Create extractor context for context-aware extractors
 */
export declare function createExtractorContext(config?: ExtractorContextConfig): ExtractorContext;
//# sourceMappingURL=create-extractor-context.d.ts.map