export type ProviderType = 'anime' | 'movies' | 'manga' | 'light-novels' | 'meta';
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
    /** Author information */
    author: {
        name: string;
        email?: string;
        url?: string;
    };
    /** Extension category */
    category: ProviderType;
    /** Main entry point URL or file path */
    main: string;
    /** Factory function name exported by this extension */
    factoryName: string;
    /** Minimum required consumet version */
    minConsumetVersion?: string;
    /** Maximum supported consumet version */
    maxConsumetVersion?: string;
    /** Dependencies on other extensions */
    dependencies?: Record<string, string>;
    /** Extension tags for searching/filtering */
    tags?: string[];
    /** Homepage URL */
    homepage?: string;
    /** Repository URL */
    repository?: string;
    /** Bug tracker URL */
    bugs?: string;
    /** License identifier */
    license?: string;
    /** Extension icon URL */
    icon?: string;
    /** Screenshots or preview images */
    screenshots?: string[];
    /** Extension settings schema */
    settings?: {
        [key: string]: {
            type: 'string' | 'number' | 'boolean' | 'select';
            default: any;
            description?: string;
            options?: any[];
        };
    };
    /** Supported languages/regions */
    languages?: string[];
    /** Whether this extension requires adult content warnings */
    nsfw?: boolean;
    /** Extension status */
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
    /** Last updated timestamp */
    lastUpdated: string;
    /** Extension changelog URL */
    changelog?: string;
}
/**
 * Extension registry interface for managing multiple extensions
 */
export interface ExtensionRegistry {
    /** Registry metadata */
    metadata: {
        name: string;
        description: string;
        version: string;
        lastUpdated: string;
        url: string;
    };
    /** List of available extensions */
    extensions: ExtensionManifest[];
}
/**
 * Extension installation result
 */
export interface ExtensionInstallResult {
    success: boolean;
    extension?: ExtensionManifest;
    error?: string;
    warnings?: string[];
}
/**
 * Extension search filters
 */
export interface ExtensionSearchFilters {
    category?: ExtensionManifest['category'];
    tags?: string[];
    status?: ExtensionManifest['status'];
    nsfw?: boolean;
    language?: string;
    query?: string;
}
//# sourceMappingURL=extension-manifest.d.ts.map