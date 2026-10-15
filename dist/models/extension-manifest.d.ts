export type ProviderType = 'anime' | 'movies' | 'manga' | 'light-novels' | 'meta';
export interface ExtractorInfo {
    /** name of the extractor like MegaCloud; server names starting with it resolve to this extractor */
    name: string;
    /** Other server name prefixes served by this extractor, e.g. MegaCloud: ['upcloud', 'akcloud'] */
    aliases?: string[];
    /** version of the extractor */
    version: string;
    /** Lowest CONTEXT_VERSION this extractor runs on (missing means 1); older libraries refuse it */
    minContextVersion?: number;
    /** Immutable URL of this exact version (`registry/extractors/<name>/<version>.js`), written by prepare-registry */
    main: string;
    /** SHA-256 hex digest of the compiled JS file for integrity verification */
    sha256?: string;
    /** Repo-relative build output this version is published from, e.g. `dist/bundles/extractors/kwik.js` (built from `src/extractors/kwik.ts`) */
    distFile?: string;
}
/**
 * Extension manifest interface for defining extension metadata
 */
export interface ExtensionManifest {
    /** Unique identifier for the extension */
    id: string;
    /** Human-readable name */
    name: string;
    /** Brief description of what the extension provides */
    description: string;
    /** Extension version (semver format) */
    version: string;
    /**
     * Lowest CONTEXT_VERSION this extension runs on; missing means 1. Libraries with an older context
     * list the entry but refuse to run it with a RegistryError (`INCOMPATIBLE_ENTRY`).
     */
    minContextVersion?: number;
    /** Author information */
    author: {
        name: string;
        email?: string;
        url?: string;
    };
    /** Extension category */
    category: ProviderType;
    /** Immutable URL of this exact version (`registry/extensions/<id>/<version>.js`), written by prepare-registry */
    main: string;
    /** Factory function names exported by this extension */
    factoryName: string;
    /** SHA-256 hex digest of the compiled JS file for integrity verification */
    sha256?: string;
    /** Repo-relative build output this version is published from, e.g. `dist/bundles/providers/anime/anikoto/create-anikoto.js` */
    distFile?: string;
    /** Homepage URL */
    baseUrl: string;
    /** Extension icon URL */
    logo: string;
    /** Supported languages/regions */
    languages?: string[];
    /** Whether this extension requires adult content warnings */
    nsfw?: boolean;
    /** Extension status */
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
    /** Last updated timestamp */
    lastUpdated: string;
    /** extractors name used in the provider */
    extractors: string[];
    /** subbed for anime's */
    subbed?: boolean;
    /** dubbed for anime's */
    dubbed?: boolean;
    /** isSourceEmbed (boolean value to represent if a provider needs extractors) */
    isSourceEmbed?: boolean;
    /** isSourceDirect (boolean value to represent if a provider has direct sources)*/
    isSourceDirect?: boolean;
    /** does the provider have multiple servers/extractors to choose from */
    haveMultiServers?: boolean;
}
/**
 * A registry as passed to ProviderManager / ExtractorManager: the bundled `ExtensionRegistry`, or one
 * downloaded as JSON. Checked at runtime, so an invalid registry throws a RegistryError.
 */
export interface ExtensionRegistryData {
    /** Registry format version (REGISTRY_SCHEMA_VERSION); registries without one read as 1 */
    schemaVersion?: number;
    extensions: ExtensionManifest[];
    extractors: ExtractorInfo[];
}
//# sourceMappingURL=extension-manifest.d.ts.map