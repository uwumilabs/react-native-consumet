import { ExtractorManager } from './ExtractorManager';
import type { ProviderContext } from '../models/provider-context';
import { type IAnimeProvider, type IAnimeResult, type IMovieProvider, type IMovieResult, type ISearch, type ProviderContextConfig } from '../models';
import extensionRegistry from '../extension-registry.json';
import type { ExtensionManifest, ProviderType } from '../models/extension-manifest';
import { type AnimeProviderId, type MovieProviderId, type ProviderInstanceOf } from './provider-maps';
import { type ExecuteCodeOptions, type IntegrityOptions } from './extension-integrity';
export interface ProviderLoadOptions {
    /** Base URL for the provider; defaults to the registry entry's `baseUrl` (so domain moves are registry-only). */
    baseUrl?: string;
}
export declare class ProviderManager {
    private providerContext;
    private extractorManager;
    private loadedExtensions;
    private extensionManifest;
    private integrityOptions;
    constructor(registry: typeof extensionRegistry, providerConfig?: ProviderContextConfig, integrityOptions?: IntegrityOptions);
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
     * Get extension metadata by ID/ name (case-insensitive) like 'zoro' or 'Zoro'
     */
    getExtensionMetadata(extensionId: string): ExtensionManifest;
    /**
     * Load an extension by ID from the extensionManifest
     */
    loadExtension<T extends string>(extensionId: T, options?: ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /**
     * Attach the correct prototype to the loaded provider instance so runtime instanceof checks pass
     * and developer tooling understands the shape better.
     */
    private attachProviderPrototype;
    /**
     * Execute provider code and create instance (extensionManifest-based).
     * The code must match `metadata.sha256` unless `options.skipIntegrity` is set.
     *
     * @throws IntegrityError before running anything if the hash or factory name is invalid
     */
    executeProviderCode<T extends string>(code: string, factoryName: string, metadata: ExtensionManifest & {
        id: T;
    }, options?: ExecuteCodeOptions & ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /**
     * Create execution context for provider code
     */
    private createExecutionContext;
    /**
     * Create models context: the base parsers and the library's real enums
     */
    private createModelsContext;
    /**
     * Validate provider instance based on category
     */
    private validateProviderInstance;
    /**
     * Get anime provider
     */
    getAnimeProvider(extensionId: AnimeProviderId, options?: ProviderLoadOptions): Promise<IAnimeProvider>;
    /**
     * Get movie provider
     */
    getMovieProvider(extensionId: MovieProviderId, options?: ProviderLoadOptions): Promise<IMovieProvider>;
    /**
     * Get the extractor manager shared by the providers this manager loads
     */
    getExtractorManager(): ExtractorManager;
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