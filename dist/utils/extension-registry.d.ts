import type { ExtensionManifest, ExtensionRegistry, ExtensionInstallResult, ExtensionSearchFilters } from '../models/extension-manifest';
/**
 * Extension registry manager for discovering and installing extensions
 */
export declare class ExtensionRegistryManager {
    private registries;
    private installedExtensions;
    private extensionInstances;
    /**
     * Add a registry URL to discover extensions from
     */
    addRegistry(url: string): Promise<void>;
    /**
     * Add a registry object directly (useful for testing or local registries)
     */
    addRegistryObject(url: string, registry: ExtensionRegistry): void;
    /**
     * Search for extensions across all registered registries
     */
    searchExtensions(filters?: ExtensionSearchFilters): ExtensionManifest[];
    /**
     * Get extension manifest by ID
     */
    getExtensionManifest(extensionId: string): ExtensionManifest | undefined;
    /**
     * Install an extension by ID
     */
    installExtension(extensionId: string): Promise<ExtensionInstallResult>;
    /**
     * Create a provider instance from an installed extension
     */
    createProvider(extensionId: string, factoryName: string): Promise<any>;
    /**
     * Uninstall an extension
     */
    uninstallExtension(extensionId: string): boolean;
    /**
     * Get list of installed extensions
     */
    getInstalledExtensions(): ExtensionManifest[];
    /**
     * Get available extensions by category
     */
    getExtensionsByCategory(category: ExtensionManifest['category']): ExtensionManifest[];
    /**
     * Check for extension updates
     */
    checkForUpdates(): Promise<Array<{
        extension: ExtensionManifest;
        currentVersion: string;
        availableVersion: string;
    }>>;
    /**
     * Clear all cached provider instances
     */
    clearCache(): void;
    /**
     * Get registry information
     */
    getRegistries(): Array<{
        url: string;
        registry: ExtensionRegistry;
    }>;
    /**
     * Remove a registry
     */
    removeRegistry(url: string): boolean;
}
/**
 * Create a default extension registry manager instance
 */
export declare function createExtensionManager(): ExtensionRegistryManager;
/**
 * Default extension registry URLs
 */
export declare const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/extensions/registry.json";
/**
* Create a provider instance from a URL with automatic context injection
*
* @param url - URL to fetch the provider from
* @param factoryName - Name of the factory function to call (e.g., 'createZoro')
* @param config - Configuration options
* @returns Promise resolving to the configured provider instance
*
* @example
* ```typescript
* // Automatically inject context and create provider
* const zoro = await createProviderFromURL(
*   'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js',
*   'createZoro'
* );
*
* const results = await zoro.search('One Piece');
* ```
*/
export declare function createProviderFromURL(url: string, factoryName: string): Promise<any>;
//# sourceMappingURL=extension-registry.d.ts.map