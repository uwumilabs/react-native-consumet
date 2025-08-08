import { type ProviderContextConfig } from './utils/create-provider-context';
import type { ProviderContext } from './models/provider-context';
import { type IAnimeInfo, type IAnimeResult, type IMovieResult, type IMovieInfo, type ISearch, type ISource, type IEpisodeServer, TvType } from './models';
import type { ExtensionManifest, ProviderType } from './models/extension-manifest';
/**
 * Base provider interface with required methods for extensions
 */
interface BaseProviderInstance {
    name: string;
    baseUrl: string;
    logo: string;
    classPath: string;
    search(query: string, page?: number): Promise<ISearch<any>>;
    fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>;
    fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>;
    fetchSpotlight?(...args: any[]): Promise<ISearch<any>>;
}
/**
 * Anime provider interface
 */
interface AnimeProviderInstance extends BaseProviderInstance {
    search(query: string, page?: number): Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo(animeId: string, ...args: any[]): Promise<IAnimeInfo>;
    fetchSpotlight?(...args: any[]): Promise<ISearch<IAnimeResult>>;
}
/**
 * Movie provider interface
 */
interface MovieProviderInstance extends BaseProviderInstance {
    search(query: string, page?: number): Promise<ISearch<IMovieResult>>;
    fetchMediaInfo(mediaId: string): Promise<IMovieInfo>;
    fetchSpotlight?(...args: any[]): Promise<ISearch<IMovieResult>>;
    supportedTypes: Set<TvType>;
}
export declare class ProviderManager {
    private providerContext;
    private loadedExtensions;
    private extensionManifest;
    constructor(config?: ProviderContextConfig);
    /**
     * Load and parse the registry
     */
    private loadRegistry;
    /**
     * Get all available extensions
     */
    getAvailableExtensions(): ExtensionManifest[];
    /**
     * Get extensions by category
     */
    getExtensionsByCategory(category: ProviderType): ExtensionManifest[];
    /**
     * Get extension metadata by ID
     */
    getExtensionMetadata(extensionId: string): ExtensionManifest | null;
    /**
     * Load provider code from file path or URL (for testing purposes)
     *
     * @param source - File path (e.g., './dist/providers/anime/zoro.js') or URL
     * @param factoryName - Factory function name (e.g., 'createZoro', 'createHiMovies')
     * @param extensionId - Optional custom extension ID for caching
     */
    loadProviderCode(source: string, factoryName: string, extensionId?: string): Promise<AnimeProviderInstance | MovieProviderInstance>;
    /**
     * Load an extension by ID from the registry
     */
    loadExtension(extensionId: string): Promise<BaseProviderInstance>;
    /**
     * Execute provider code directly with minimal metadata (for testing)
     */
    private executeProviderCodeDirect;
    /**
     * Execute provider code and create instance (registry-based)
     */
    private executeProviderCode;
    /**
     * Create execution context for provider code
     */
    private createExecutionContext;
    /**
     * Create models context
     */
    private createModelsContext;
    /**
     * Create __awaiter helper for compatibility
     */
    private createAwaiterHelper;
    /**
     * Validate provider instance based on category
     */
    private validateProviderInstance;
    /**
     * Get a type-safe anime provider
     */
    getAnimeProvider(extensionId: string): Promise<AnimeProviderInstance>;
    /**
     * Get a type-safe movie provider
     */
    getMovieProvider(extensionId: string): Promise<MovieProviderInstance>;
    /**
     * Get any provider (use with caution - prefer typed methods)
     */
    getProvider(extensionId: string): Promise<BaseProviderInstance>;
    /**
     * Get the provider context
     */
    getProviderContext(): ProviderContext;
    /**
     * Get registry metadata
     */
    getRegistryMetadata(): {
        name: string;
        description: string;
        version: string;
        lastUpdated: string;
        url: string;
    };
    /**
     * Search across all loaded providers of a specific category
     */
    searchAcrossProviders(category: ProviderType, query: string, page?: number): Promise<Array<{
        extensionId: string;
        results: ISearch<any>;
    }>>;
    /**
     * Load provider code from string (for testing purposes)
     */
    loadProviderCodeFromString(code: string, factoryName: string, extensionId?: string): Promise<AnimeProviderInstance | MovieProviderInstance>;
    /**
     * Convenience method to load Zoro provider (for testing)
     */
    loadZoro(source?: string): Promise<AnimeProviderInstance>;
    /**
     * Convenience method to load HiMovies provider (for testing)
     */
    loadHiMovies(source?: string): Promise<MovieProviderInstance>;
    /**
     * Auto-detect and load any provider from file (for testing)
     */
    loadAnyProvider(source: string, extensionId?: string): Promise<BaseProviderInstance>;
}
export default ProviderManager;
//# sourceMappingURL=ProviderManager.d.ts.map