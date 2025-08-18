import type { ProviderContext } from '../models/provider-context';
import { type IAnimeResult, type IMovieResult, type ISearch, type ProviderContextConfig } from '../models';
import extensionRegistry from '../extension-registry.json';
import type { ExtensionManifest, ProviderType } from '../models/extension-manifest';
import type { AnimeProvider, animeProviders, MovieProvider, movieProviders } from './provider-maps';
export declare class ProviderManager {
    private providerContext;
    private loadedExtensions;
    private extensionManifest;
    constructor(registry: typeof extensionRegistry, providerConfig?: ProviderContextConfig);
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
    loadExtension<T extends AnimeProvider | MovieProvider>(extensionId: T): Promise<T extends AnimeProvider ? InstanceType<(typeof animeProviders)[T]> : T extends MovieProvider ? InstanceType<(typeof movieProviders)[T]> : never>;
    /**
     * Execute provider code and create instance (extensionManifest-based)
     */
    executeProviderCode<T extends AnimeProvider | MovieProvider>(code: string, factoryName: string, metadata: ExtensionManifest & {
        id: T;
    }): Promise<T extends AnimeProvider ? InstanceType<(typeof animeProviders)[T]> : T extends MovieProvider ? InstanceType<(typeof movieProviders)[T]> : never>;
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
    getAnimeProvider<T extends AnimeProvider>(extensionId: T): Promise<InstanceType<(typeof animeProviders)[T]>>;
    /**
     * Get movie provider
     */
    getMovieProvider<T extends MovieProvider>(extensionId: T): Promise<InstanceType<(typeof movieProviders)[T]>>;
    /**
     * Get the provider context
     */
    getProviderContext(): ProviderContext;
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