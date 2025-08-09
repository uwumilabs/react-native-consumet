/* eslint-disable no-new-func */
import type {
  ExtensionManifest,
  ExtensionRegistry,
  ExtensionInstallResult,
  ExtensionSearchFilters,
} from '../models/extension-manifest';
import createProviderContext from './create-provider-context';

/**
 * Extension registry manager for discovering and installing extensions
 */
export class ExtensionRegistryManager {
  private registries: Map<string, ExtensionRegistry> = new Map();
  private installedExtensions: Map<string, ExtensionManifest> = new Map();
  private extensionInstances: Map<string, any> = new Map();

  /**
   * Add a registry URL to discover extensions from
   */
  async addRegistry(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`);
      }

      const registry: ExtensionRegistry = await response.json();
      this.registries.set(url, registry);
    } catch (error) {
      throw new Error(`Failed to add registry ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a registry object directly (useful for testing or local registries)
   */
  addRegistryObject(url: string, registry: ExtensionRegistry): void {
    this.registries.set(url, registry);
  }

  /**
   * Search for extensions across all registered registries
   */
  searchExtensions(filters: ExtensionSearchFilters = {}): ExtensionManifest[] {
    const allExtensions: ExtensionManifest[] = [];

    // Collect extensions from all registries
    for (const registry of this.registries.values()) {
      allExtensions.push(...registry.extensions);
    }

    // Apply filters
    return allExtensions.filter((ext) => {
      if (filters.category && ext.category !== filters.category) return false;
      if (filters.status && ext.status !== filters.status) return false;
      if (filters.nsfw !== undefined && ext.nsfw !== filters.nsfw) return false;
      if (filters.language && ext.languages && !ext.languages.includes(filters.language)) return false;

      if (filters.tags && filters.tags.length > 0) {
        const extensionTags = ext.tags || [];
        if (!filters.tags.some((tag) => extensionTags.includes(tag))) return false;
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
  getExtensionManifest(extensionId: string): ExtensionManifest | undefined {
    // Check installed extensions first
    if (this.installedExtensions.has(extensionId)) {
      return this.installedExtensions.get(extensionId);
    }

    // Search in registries
    for (const registry of this.registries.values()) {
      const extension = registry.extensions.find((ext) => ext.id === extensionId);
      if (extension) return extension;
    }

    return undefined;
  }

  /**
   * Install an extension by ID
   */
  async installExtension(extensionId: string): Promise<ExtensionInstallResult> {
    try {
      const manifest = this.getExtensionManifest(extensionId);
      if (!manifest) {
        return {
          success: false,
          error: `Extension ${extensionId} not found in any registry`,
        };
      }

      // Validate extension URL accessibility
      try {
        const response = await fetch(manifest.main, { method: 'HEAD' });
        if (!response.ok) {
          return {
            success: false,
            error: `Extension file not accessible: ${response.status} ${response.statusText}`,
          };
        }
      } catch (fetchError) {
        return {
          success: false,
          error: `Failed to access extension file: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`,
        };
      }

      // Mark as installed
      this.installedExtensions.set(extensionId, manifest);

      return {
        success: true,
        extension: manifest,
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a provider instance from an installed extension
   */
  async createProvider(extensionId: string, factoryName: string): Promise<any> {
    const manifest = this.installedExtensions.get(extensionId);
    if (!manifest) {
      throw new Error(`Extension ${extensionId} is not installed`);
    }

    if (!manifest.factories || !manifest.factories.includes(factoryName)) {
      throw new Error(`Factory ${factoryName} not available in extension ${extensionId}`);
    }

    const cacheKey = `${extensionId}:${factoryName}`;

    // Return cached instance if available
    if (this.extensionInstances.has(cacheKey)) {
      return this.extensionInstances.get(cacheKey);
    }

    // Create new instance
    const provider = await createProviderFromURL(manifest.main, factoryName);

    // Cache the instance
    this.extensionInstances.set(cacheKey, provider);

    return provider;
  }

  /**
   * Uninstall an extension
   */
  uninstallExtension(extensionId: string): boolean {
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
  getInstalledExtensions(): ExtensionManifest[] {
    return Array.from(this.installedExtensions.values());
  }

  /**
   * Get available extensions by category
   */
  getExtensionsByCategory(category: ExtensionManifest['category']): ExtensionManifest[] {
    return this.searchExtensions({ category });
  }

  /**
   * Check for extension updates
   */
  async checkForUpdates(): Promise<
    Array<{
      extension: ExtensionManifest;
      currentVersion: string;
      availableVersion: string;
    }>
  > {
    const updates: Array<{
      extension: ExtensionManifest;
      currentVersion: string;
      availableVersion: string;
    }> = [];

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
  clearCache(): void {
    this.extensionInstances.clear();
  }

  /**
   * Get registry information
   */
  getRegistries(): Array<{ url: string; registry: ExtensionRegistry }> {
    return Array.from(this.registries.entries()).map(([url, registry]) => ({ url, registry }));
  }

  /**
   * Remove a registry
   */
  removeRegistry(url: string): boolean {
    return this.registries.delete(url);
  }
}

/**
 * Create a default extension registry manager instance
 */
export function createExtensionManager(): ExtensionRegistryManager {
  return new ExtensionRegistryManager();
}

/**
 * Default extension registry URLs
 */
export const DEFAULT_REGISTRY =
  'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/extensions/registry.json';

/**
 * Create a provider instance from a URL with automatic context injection
 * Note: Uses Function constructor for dynamic code execution - implement your own secure alternative
 */
export async function createProviderFromURL(url: string, factoryName: string): Promise<any> {
  const context = createProviderContext();

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch provider from ${url}: ${res.status} ${res.statusText}`);
  }

  const moduleCode = await res.text();

  // Basic module execution - developers should implement secure alternatives
  const moduleExports: any = {};
  const moduleFunction = new Function('exports', 'module', moduleCode);
  const moduleObject = { exports: moduleExports };

  try {
    moduleFunction(moduleExports, moduleObject);
  } catch (error) {
    throw new Error(`Failed to execute extension module: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const finalExports = Object.keys(moduleObject.exports).length > 0 ? moduleObject.exports : moduleExports;

  if (!finalExports[factoryName] || typeof finalExports[factoryName] !== 'function') {
    const availableFunctions = Object.keys(finalExports).filter((key) => typeof finalExports[key] === 'function');
    throw new Error(
      `Provider module does not export a function named '${factoryName}'. ` +
        `Available functions: ${availableFunctions.length > 0 ? availableFunctions.join(', ') : 'none'}`
    );
  }

  return finalExports[factoryName](context);
}
