/**
 * Example usage of the Extension Registry System
 * This demonstrates how to discover, install, and use extensions
 */

import { setupDefaultExtensionManager, type ExtensionSearchFilters } from 'react-native-consumet';

// Example: Setting up the extension manager
async function setupExtensions() {
  // Create extension manager with default registries
  const extensionManager = await setupDefaultExtensionManager();

  console.log(
    'Extension manager set up with registries:',
    extensionManager.getRegistries().map((r) => r.url)
  );

  return extensionManager;
}

// Example: Searching for extensions
async function searchForAnimeExtensions() {
  const manager = await setupExtensions();

  // Search for anime extensions
  const animeExtensions = manager.searchExtensions({
    category: 'anime',
    status: 'stable',
  });

  console.log(`Found ${animeExtensions.length} anime extensions:`);
  animeExtensions.forEach((ext) => {
    console.log(`- ${ext.name} (${ext.version}) - ${ext.description}`);
  });

  return animeExtensions;
}

// Example: Installing and using an extension
async function useZoroExtension() {
  const manager = await setupExtensions();

  // Install Zoro extension
  const installResult = await manager.installExtension('zoro-anime');

  if (installResult.success) {
    console.log('✅ Zoro extension installed successfully!');

    if (installResult.warnings?.length) {
      console.warn('Warnings:', installResult.warnings);
    }

    // Create a provider instance
    const zoroProvider = await manager.createProvider('zoro-anime', 'createZoro');

    // Use the provider
    const searchResults = await zoroProvider.search('Naruto');
    console.log(`Found ${searchResults.results?.length || 0} results for "Naruto"`);

    return zoroProvider;
  } else {
    console.error('❌ Failed to install Zoro extension:', installResult.error);
  }
}

// Example: Advanced search with filters
async function advancedExtensionSearch() {
  const manager = await setupExtensions();

  const filters: ExtensionSearchFilters = {
    category: 'anime',
    tags: ['popular', 'streaming'],
    status: 'stable',
    nsfw: false,
    query: 'anime',
  };

  const results = manager.searchExtensions(filters);

  console.log('Advanced search results:');
  results.forEach((ext) => {
    console.log(`${ext.name}: ${ext.description}`);
    console.log(`  Tags: ${ext.tags?.join(', ') || 'none'}`);
    console.log(`  Languages: ${ext.languages?.join(', ') || 'unknown'}`);
    console.log(`  Author: ${ext.author.name}`);
    console.log('---');
  });
}

// Example: Managing installed extensions
async function manageInstalledExtensions() {
  const manager = await setupExtensions();

  // Install multiple extensions
  const extensionsToInstall = ['zoro-anime', 'gogoanime', 'flixhq-movies'];

  for (const extId of extensionsToInstall) {
    const result = await manager.installExtension(extId);
    console.log(`${extId}: ${result.success ? '✅' : '❌'} ${result.error || 'installed'}`);
  }

  // List installed extensions
  const installed = manager.getInstalledExtensions();
  console.log(`\\nInstalled extensions (${installed.length}):`);
  installed.forEach((ext) => {
    console.log(`- ${ext.name} v${ext.version} (${ext.category})`);
  });

  // Check for updates
  const updates = await manager.checkForUpdates();
  if (updates.length > 0) {
    console.log(`\\nUpdates available (${updates.length}):`);
    updates.forEach((update) => {
      console.log(`- ${update.extension.name}: ${update.currentVersion} → ${update.availableVersion}`);
    });
  } else {
    console.log('\\n✅ All extensions are up to date');
  }
}

// Example: Working with extension categories
async function exploreExtensionCategories() {
  const manager = await setupExtensions();

  const categories = ['anime', 'movies', 'manga', 'meta'] as const;

  for (const category of categories) {
    const extensions = manager.getExtensionsByCategory(category);
    console.log(`\\n${category.toUpperCase()} Extensions (${extensions.length}):`);

    extensions.forEach((ext) => {
      console.log(`  - ${ext.name}: ${ext.description}`);
      if (ext.settings) {
        console.log(`    Settings: ${Object.keys(ext.settings).join(', ')}`);
      }
    });
  }
}

// Example: Error handling and fallbacks
async function robustExtensionUsage() {
  try {
    const manager = await setupExtensions();

    // Try to install and use an extension with error handling
    const extensionId = 'zoro-anime';
    const installResult = await manager.installExtension(extensionId);

    if (!installResult.success) {
      console.error(`Failed to install ${extensionId}:`, installResult.error);
      return;
    }

    try {
      const provider = await manager.createProvider(extensionId, 'createZoro');
      const results = await provider.search('One Piece');
      console.log(`Successfully searched with ${extensionId}, found ${results.results?.length || 0} results`);
    } catch (providerError) {
      console.error(`Provider error:`, providerError);

      // Fallback: uninstall problematic extension
      const uninstalled = manager.uninstallExtension(extensionId);
      console.log(`Extension ${extensionId} ${uninstalled ? 'removed' : 'could not be removed'}`);
    }
  } catch (setupError) {
    console.error('Failed to set up extension manager:', setupError);
  }
}

// Export examples for usage
export {
  setupExtensions,
  searchForAnimeExtensions,
  useZoroExtension,
  advancedExtensionSearch,
  manageInstalledExtensions,
  exploreExtensionCategories,
  robustExtensionUsage,
};
