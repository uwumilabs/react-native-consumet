import type { ProviderContext } from '../models/provider-context';
import { AnimeParser, MovieParser } from '../models';
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
     * Custom extractors (optional) - defaults to built-in extractors
     */
    extractors?: any;
    /**
     * Custom logger (optional) - defaults to console
     */
    logger?: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
    /**
     * Custom AnimeParser base class (optional) - for advanced use cases
     */
    AnimeParser?: typeof AnimeParser;
    /**
     * Custom MovieParser base class (optional) - for advanced use cases
     */
    MovieParser?: typeof MovieParser;
}
/**
 * Creates a provider context with sensible defaults for extensions
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext ready for use with extensions
 */
export declare function createProviderContext(config?: ProviderContextConfig): ProviderContext;
/**
 * Creates a React Native optimized provider context
 * This version is specifically tuned for React Native environments
 *
 * @param config Optional configuration to override defaults
 * @returns Complete ProviderContext optimized for React Native
 */
export declare function createReactNativeProviderContext(config?: ProviderContextConfig): ProviderContext;
/**
 * Quick helper to create a context with just custom axios
 */
export declare function createProviderContextWithAxios(axiosInstance: any): ProviderContext;
export default createProviderContext;
//# sourceMappingURL=create-provider-context.d.ts.map