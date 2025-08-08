"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REGISTRY = exports.ExtensionRegistryManager = void 0;
exports.createExtensionManager = createExtensionManager;
exports.createProviderFromURL = createProviderFromURL;
const create_provider_context_1 = __importDefault(require("./create-provider-context"));
/**
 * Extension registry manager for discovering and installing extensions
 */
class ExtensionRegistryManager {
    constructor() {
        this.registries = new Map();
        this.installedExtensions = new Map();
        this.extensionInstances = new Map();
    }
    /**
     * Add a registry URL to discover extensions from
     */
    async addRegistry(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`);
            }
            const registry = await response.json();
            this.registries.set(url, registry);
        }
        catch (error) {
            throw new Error(`Failed to add registry ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Add a registry object directly (useful for testing or local registries)
     */
    addRegistryObject(url, registry) {
        this.registries.set(url, registry);
    }
    /**
     * Search for extensions across all registered registries
     */
    searchExtensions(filters = {}) {
        const allExtensions = [];
        // Collect extensions from all registries
        for (const registry of this.registries.values()) {
            allExtensions.push(...registry.extensions);
        }
        // Apply filters
        return allExtensions.filter((ext) => {
            if (filters.category && ext.category !== filters.category)
                return false;
            if (filters.status && ext.status !== filters.status)
                return false;
            if (filters.nsfw !== undefined && ext.nsfw !== filters.nsfw)
                return false;
            if (filters.language && ext.languages && !ext.languages.includes(filters.language))
                return false;
            if (filters.tags && filters.tags.length > 0) {
                const extensionTags = ext.tags || [];
                if (!filters.tags.some((tag) => extensionTags.includes(tag)))
                    return false;
            }
            if (filters.query) {
                const query = filters.query.toLowerCase();
                if (!ext.name.toLowerCase().includes(query) && !ext.description.toLowerCase().includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Get extension manifest by ID
     */
    getExtensionManifest(extensionId) {
        // Check installed extensions first
        if (this.installedExtensions.has(extensionId)) {
            return this.installedExtensions.get(extensionId);
        }
        // Search in registries
        for (const registry of this.registries.values()) {
            const extension = registry.extensions.find((ext) => ext.id === extensionId);
            if (extension)
                return extension;
        }
        return undefined;
    }
    /**
     * Install an extension by ID
     */
    async installExtension(extensionId) {
        try {
            const manifest = this.getExtensionManifest(extensionId);
            if (!manifest) {
                return {
                    success: false,
                    error: `Extension ${extensionId} not found in any registry`,
                };
            }
            // Verify that the manifest factories match what's actually exported
            const missingFactory = manifest.factoryName;
            const missingFactories = missingFactory ? [manifest.factoryName] : [];
            const warnings = missingFactories.length > 0
                ? [`Manifest lists factories not found in code: ${missingFactories.join(', ')}`]
                : [];
            // Mark as installed
            this.installedExtensions.set(extensionId, manifest);
            return {
                success: true,
                extension: manifest,
                warnings,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Create a provider instance from an installed extension
     */
    async createProvider(extensionId, factoryName) {
        const manifest = this.installedExtensions.get(extensionId);
        if (!manifest) {
            throw new Error(`Extension ${extensionId} is not installed`);
        }
        if (!manifest.factoryName.includes(factoryName)) {
            throw new Error(`Factory ${factoryName} not available in extension ${extensionId}`);
        }
        const cacheKey = `${extensionId}:${factoryName}`;
        // Return cached instance if available
        if (this.extensionInstances.has(cacheKey)) {
            return this.extensionInstances.get(cacheKey);
        }
        // Create new instance
        const provider = await createProviderFromURL(manifest.main, factoryName, config);
        // Cache the instance
        this.extensionInstances.set(cacheKey, provider);
        return provider;
    }
    /**
     * Uninstall an extension
     */
    uninstallExtension(extensionId) {
        if (!this.installedExtensions.has(extensionId)) {
            return false;
        }
        // Remove from installed extensions
        this.installedExtensions.delete(extensionId);
        // Clear cached instances
        const keysToDelete = Array.from(this.extensionInstances.keys()).filter((key) => key.startsWith(`${extensionId}:`));
        keysToDelete.forEach((key) => this.extensionInstances.delete(key));
        return true;
    }
    /**
     * Get list of installed extensions
     */
    getInstalledExtensions() {
        return Array.from(this.installedExtensions.values());
    }
    /**
     * Get available extensions by category
     */
    getExtensionsByCategory(category) {
        return this.searchExtensions({ category });
    }
    /**
     * Check for extension updates
     */
    async checkForUpdates() {
        const updates = [];
        for (const installed of this.installedExtensions.values()) {
            // Find the latest version in registries
            for (const registry of this.registries.values()) {
                const latest = registry.extensions.find((ext) => ext.id === installed.id);
                if (latest && latest.version !== installed.version) {
                    updates.push({
                        extension: latest,
                        currentVersion: installed.version,
                        availableVersion: latest.version,
                    });
                    break;
                }
            }
        }
        return updates;
    }
    /**
     * Clear all cached provider instances
     */
    clearCache() {
        this.extensionInstances.clear();
    }
    /**
     * Get registry information
     */
    getRegistries() {
        return Array.from(this.registries.entries()).map(([url, registry]) => ({ url, registry }));
    }
    /**
     * Remove a registry
     */
    removeRegistry(url) {
        return this.registries.delete(url);
    }
}
exports.ExtensionRegistryManager = ExtensionRegistryManager;
/**
 * Create a default extension registry manager instance
 */
function createExtensionManager() {
    return new ExtensionRegistryManager();
}
/**
 * Default extension registry URLs
 */
exports.DEFAULT_REGISTRY = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/extensions/registry.json';
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
async function createProviderFromURL(url, factoryName) {
    const { context = (0, create_provider_context_1.default)() } = config;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch provider from ${url}: ${res.status} ${res.statusText}`);
    }
    const module = await res.text();
    if (!module[factoryName] || typeof module[factoryName] !== 'function') {
        throw new Error(`Provider module does not export a function named '${factoryName}'`);
    }
    return module[factoryName](context);
}
//# sourceMappingURL=extension-registry.js.map