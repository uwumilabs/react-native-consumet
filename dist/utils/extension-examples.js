"use strict";
/**
 * Simple example usage of Extension Registry utilities for app developers
 *
 * This shows the basic utilities provided. App developers should implement:
 * - Caching, storage, downloading, security, updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicUsage = void 0;
const react_native_consumet_1 = require("react-native-consumet");
/**
 * Basic extension manager usage example
 */
exports.BasicUsage = {
    async setup() {
        const manager = (0, react_native_consumet_1.createExtensionManager)();
        // Add registry
        await manager.addRegistry('https://registry-url.json');
        // Search extensions
        const extensions = manager.searchExtensions({ category: 'anime' });
        // Install and create provider
        if (extensions.length > 0) {
            const ext = extensions[0];
            await manager.installExtension(ext.id);
            const provider = await manager.createProvider(ext.id, ext.factories[0]);
            return provider;
        }
    },
    async utilities() {
        const manager = (0, react_native_consumet_1.createExtensionManager)();
        const extensions = manager.searchExtensions();
        // Validation
        const validExtensions = extensions.filter(ext => react_native_consumet_1.ExtensionUtils.validateManifest(ext));
        // Filtering
        const stableExtensions = react_native_consumet_1.ExtensionUtils.filterExtensions(extensions, {
            status: 'stable',
            nsfw: false,
        });
        // Grouping
        const grouped = react_native_consumet_1.ExtensionUtils.groupByCategory(extensions);
        // Statistics
        const stats = react_native_consumet_1.ExtensionUtils.getStats(extensions);
        // Version comparison
        const hasUpdate = react_native_consumet_1.ExtensionUtils.compareVersions('1.2.0', '1.1.0') > 0;
        return { validExtensions, stableExtensions, grouped, stats, hasUpdate };
    }
};
/**
 * What app developers need to implement themselves:
 *
 * 1. Storage: AsyncStorage, localStorage, fs, etc.
 * 2. Caching: TTL-based caching with size limits
 * 3. Downloads: Registry and extension fetching with retry logic
 * 4. Security: Secure code execution (sandboxing, workers)
 * 5. Updates: Automatic checking and installation
 * 6. Error handling: Comprehensive error handling and logging
 */
//# sourceMappingURL=extension-examples.js.map