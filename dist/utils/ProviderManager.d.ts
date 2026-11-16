import { type ProviderContextConfig } from './create-provider-context';
import { ExtractorManager } from './ExtractorManager';
import { type IAnimeProvider, type IAnimeResult, type IMovieProvider, type IMovieResult, type ISearch, type ProviderContext } from '../models';
import type { BundledRegistry, ExtensionManifest, ExtensionRegistryData, ProviderType } from '../models/extension-manifest';
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
/** Registry ids of the providers in the bundled registry (test/unit/provider-manager.test.ts checks the lists). */
export type KnownAnimeProviderId = 'animepahe' | 'anikoto' | 'anineko';
export type KnownMovieProviderId = 'vegamovies' | 'netflixmirror' | 'primemirror' | 'disneymirror';
/** Any registry id; known ids autocomplete, and providers added to a registry later still type-check. */
export type AnimeProviderId = KnownAnimeProviderId | (string & {});
export type MovieProviderId = KnownMovieProviderId | (string & {});
/** The provider type for an id: anime or movie when the id says so, otherwise either. */
export type ProviderInstanceOf<T> = T extends KnownAnimeProviderId ? IAnimeProvider : T extends KnownMovieProviderId ? IMovieProvider : IAnimeProvider | IMovieProvider;
/** What `getProvider(category, id)` returns: the anime or movie provider type, or the category's required methods. */
export type ProviderOfCategory<C extends ProviderType> = C extends 'anime' ? IAnimeProvider : C extends 'movies' ? IMovieProvider : {
    readonly name: string;
} & {
    [M in (typeof REQUIRED_PROVIDER_METHODS)[C][number]]: (...args: any[]) => Promise<any>;
};
export declare class ProviderManager {
    private providerContext;
    private extractorManager;
    private loads;
    private compiled;
    private extensions;
    private byKey;
    /**
     * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
     */
    constructor(registry: ExtensionRegistryData | BundledRegistry, providerConfig?: ProviderContextConfig, integrityOptions?: IntegrityOptions);
    /**
     * Get all available extensions, including any that need a newer extension context
     * (see `isCompatibleEntry`); loading those throws a RegistryError.
     */
    getAvailableExtensions(): ExtensionManifest[];
    getExtensionsByCategory(category: ProviderType): ExtensionManifest[];
    /** The registry entry for an id or name, case-insensitive ('zoro' or 'Zoro'). */
    getExtensionMetadata(extensionId: string): ExtensionManifest;
    /**
     * Load an extension by id or name. Concurrent and later calls for the same extension and base URL
     * share one load; a failed load is retried on the next call.
     */
    loadExtension<T extends string>(extensionId: T, options?: ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /**
     * Forget a loaded extension (for every base URL) and its compiled code, so the next load
     * fetches and runs it again. Extractors have their own: `getExtractorManager().invalidate(name)`.
     */
    invalidate(extensionId: string): void;
    /**
     * Run an entry's provider code and build the provider with this manager's context. The code must
     * match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is compiled once per
     * id and sha256; each call returns a new instance, an instance of its category's base parser.
     *
     * @throws RegistryError before running anything if the entry needs a newer extension context
     * @throws IntegrityError before running anything if the hash or factory name is invalid
     */
    executeProviderCode<T extends string>(code: string, metadata: ExtensionManifest & {
        id: T;
    }, options?: ExecuteCodeOptions & ProviderLoadOptions): Promise<ProviderInstanceOf<T>>;
    /** Throws unless the instance has the methods its category requires (REQUIRED_PROVIDER_METHODS). */
    private assertProviderOf;
    /**
     * Get a provider of a category, e.g. `getProvider('manga', 'mangadex')`
     *
     * @throws if the extension's registry entry is of another category
     */
    getProvider<C extends ProviderType>(category: C, extensionId: string, options?: ProviderLoadOptions): Promise<ProviderOfCategory<C>>;
    getAnimeProvider(extensionId: AnimeProviderId, options?: ProviderLoadOptions): Promise<IAnimeProvider>;
    getMovieProvider(extensionId: MovieProviderId, options?: ProviderLoadOptions): Promise<IMovieProvider>;
    /** The extractor manager shared by the providers this manager loads */
    getExtractorManager(): ExtractorManager;
    getProviderContext(): ProviderContext;
    /**
     * Search every provider of a category. A provider that fails to load or search gives an empty page
     * and its `error`, so one broken provider doesn't hide the others' results.
     */
    searchAcrossProviders(category: ProviderType, query: string, page?: number): Promise<Array<{
        extensionId: string;
        results: ISearch<IAnimeResult | IMovieResult>;
        error?: unknown;
    }>>;
}
export default ProviderManager;
//# sourceMappingURL=ProviderManager.d.ts.map