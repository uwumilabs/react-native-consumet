import { type ProviderContextConfig } from './create-provider-context';
import type { ProviderContext } from '../models/provider-context';
import { type IAnimeResult, type IMovieResult, type ISearch, AnimeParser, MovieParser } from '../models';
import type { ExtensionManifest, ProviderType } from '../models/extension-manifest';
export declare class ProviderManager {
    private providerContext;
    private loadedExtensions;
    private extensionManifest;
    constructor(config?: ProviderContextConfig);
    /**
     * Load and parse the extensionManifest
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
    getExtensionMetadata(extensionId: string): ExtensionManifest;
    /**
     * Load an extension by ID from the extensionManifest
     */
    loadExtension(extensionId: string): Promise<AnimeParser | MovieParser>;
    /**
     * Execute provider code and create instance (extensionManifest-based)
     */
    executeProviderCode(code: string, factoryName: string, metadata: ExtensionManifest): Promise<AnimeParser | MovieParser>;
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
     * Get anime provider
     */
    getAnimeProvider(extensionId: string): Promise<AnimeParser>;
    /**
     * Get movie provider
     */
    getMovieProvider(extensionId: string): Promise<MovieParser>;
    /**
     * Get the provider context
     */
    getProviderContext(): ProviderContext;
    /**
     * Get extensionManifest metadata
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
        results: ISearch<IAnimeResult | IMovieResult>;
    }>>;
}
export default ProviderManager;
//# sourceMappingURL=ProviderManager.d.ts.map