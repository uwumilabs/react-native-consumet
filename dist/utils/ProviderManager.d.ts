import { ExtractorManager } from './ExtractorManager';
import type { ProviderContext } from '../models/provider-context';
import { type IAnimeProvider, type IAnimeResult, type IMovieProvider, type IMovieResult, type ISearch, type ProviderContextConfig } from '../models';
import extensionRegistry from '../extension-registry.json';
import type { ExtensionManifest, ExtensionRegistryData, ProviderType } from '../models/extension-manifest';
import { type AnimeProviderId, type MovieProviderId, type ProviderInstanceOf } from './provider-maps';
import { type ExecuteCodeOptions, type IntegrityOptions } from './extension-integrity';
export interface ProviderLoadOptions {
    /** Base URL for the provider; defaults to the registry entry's `baseUrl` (so domain moves are registry-only). */
    baseUrl?: string;
}
/**
 * Methods a provider must have, by category; loading a provider without one of them throws.
 * They match the base parsers (AnimeParser, MovieParser, MangaParser, LightNovelParser); meta
 * lists what anime and movie meta providers share.
 */
export declare const REQUIRED_PROVIDER_METHODS: {
    readonly anime: readonly ["search", "fetchAnimeInfo", "fetchEpisodeSources", "fetchEpisodeServers"];
    readonly movies: readonly ["search", "fetchMediaInfo", "fetchEpisodeSources", "fetchEpisodeServers"];
    readonly manga: readonly ["search", "fetchMangaInfo", "fetchChapterPages"];
    readonly 'light-novels': readonly ["search", "fetchLightNovelInfo", "fetchChapterContent"];
    readonly meta: readonly ["search", "fetchEpisodeSources", "fetchEpisodeServers"];
};
/** What `getProvider(category, id)` returns: the anime or movie provider type, or the category's required methods. */
export type ProviderOfCategory<C extends ProviderType> = C extends 'anime' ? IAnimeProvider : C extends 'movies' ? IMovieProvider : {
    readonly name: string;
} & {
    [M in (typeof REQUIRED_PROVIDER_METHODS)[C][number]]: (...args: any[]) => Promise<any>;
};
export declare class ProviderManager {
    private providerContext;
    private extractorManager;
    private loadedExtensions;
    private compiledExtensions;
    private extensionManifest;
    private integrityOptions;
    /**
     * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
     */
    constructor(registry: ExtensionRegistryData | typeof extensionRegistry, providerConfig?: ProviderContextConfig, integrityOptions?: IntegrityOptions);
    /**
     * Index the validated registry entries by lowercased id, for case-insensitive lookup
     */
    private loadRegistry;
    /**
     * Get all available extensions, including any that need a newer extension context
     * (see `isCompatibleEntry`); loading those throws a RegistryError.
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
    private findExtensionMetadata;
    /**
     * Load an extension by ID from the extensionManifest. Concurrent and later calls for the same
     * extension and base URL share one load; a failed load is retried on the next call.
     */
    loadExtension<T extends string>(extensionId: T, options?: ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /**
     * Forget a loaded extension (for every base URL) and its compiled code, so the next load
     * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
     */
    invalidate(extensionId: string): void;
    /**
     * Fetch an extension's code from the registry and run it
     */
    private fetchExtension;
    /**
     * Attach the correct prototype to the loaded provider instance so runtime instanceof checks pass
     * and developer tooling understands the shape better.
     */
    private attachProviderPrototype;
    /**
     * Execute provider code and create instance (extensionManifest-based).
     * The code must match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is
     * compiled once per id and sha256; each call returns a new instance.
     *
     * @throws RegistryError before running anything if the entry needs a newer extension context
     * @throws IntegrityError before running anything if the hash or factory name is invalid
     */
    executeProviderCode<T extends string>(code: string, factoryName: string, metadata: ExtensionManifest & {
        id: T;
    }, options?: ExecuteCodeOptions & ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /**
     * Create execution context for provider code: the globals it runs with
     */
    private createExecutionContext;
    /**
     * Create models context: the base parsers and the library's real enums
     */
    private createModelsContext;
    /**
     * Validate that the instance has the methods its category requires (REQUIRED_PROVIDER_METHODS)
     */
    private validateProviderInstance;
    /**
     * Get a provider of a category, e.g. `getProvider('manga', 'mangadex')`
     *
     * @throws if the extension's registry entry is of another category
     */
    getProvider<C extends ProviderType>(category: C, extensionId: string, options?: ProviderLoadOptions): Promise<ProviderOfCategory<C>>;
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