import type { ProviderContext } from '../models/provider-context';
import { AnimeParser, MovieParser, MangaParser } from '../models';
/**
 * Configuration options for creating a provider context
 */
export interface ProviderContextConfig {
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
    /**
     * Custom AnimeParser base class (optional) - for advanced use cases
     */
    AnimeParser?: typeof AnimeParser;
    /**
     * Custom MovieParser base class (optional) - for advanced use cases
     */
    MovieParser?: typeof MovieParser;
    /**
     * Custom MangaParser base class (optional) - for advanced use cases
     */
    MangaParser?: typeof MangaParser;
}
/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
export declare function createProviderContext(config?: ProviderContextConfig): ProviderContext;
export default createProviderContext;
//# sourceMappingURL=create-provider-context.d.ts.map