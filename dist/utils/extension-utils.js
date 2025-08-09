"use strict";
/**
 * Basic utilities for extension management that app developers can use
 * App developers handle their own caching, storage, downloading, and update mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionUtils = void 0;
/**
 * Essential utility functions for working with extensions
 */
class ExtensionUtils {
    /**
     * Validate extension manifest format
     */
    static validateManifest(manifest) {
        if (!manifest || typeof manifest !== 'object')
            return false;
        const required = ['id', 'name', 'description', 'version', 'author', 'category', 'main', 'factories', 'status'];
        for (const field of required) {
            if (!(field in manifest)) {
                console.warn(`Extension manifest missing required field: ${field}`);
                return false;
            }
        }
        if (!Array.isArray(manifest.factories) || manifest.factories.length === 0) {
            console.warn('Extension manifest must have at least one factory function');
            return false;
        }
        return true;
    }
    /**
     * Compare extension versions (basic semver comparison)
     */
    static compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            if (v1part > v2part)
                return 1;
            if (v1part < v2part)
                return -1;
        }
        return 0;
    }
    /**
     * Check if extension version satisfies minimum requirement
     */
    static satisfiesMinVersion(extensionVersion, minVersion) {
        return this.compareVersions(extensionVersion, minVersion) >= 0;
    }
    /**
     * Generate extension cache key
     */
    static getCacheKey(extensionId, factoryName) {
        return `ext:${extensionId}:${factoryName}`;
    }
    /**
     * Filter extensions by criteria
     */
    static filterExtensions(extensions, criteria) {
        return extensions.filter((ext) => {
            if (criteria.category && ext.category !== criteria.category)
                return false;
            if (criteria.status && ext.status !== criteria.status)
                return false;
            if (criteria.nsfw !== undefined && ext.nsfw !== criteria.nsfw)
                return false;
            if (criteria.query) {
                const query = criteria.query.toLowerCase();
                const searchText = `${ext.name} ${ext.description}`.toLowerCase();
                if (!searchText.includes(query))
                    return false;
            }
            if (criteria.tags && criteria.tags.length > 0) {
                const extTags = ext.tags || [];
                if (!criteria.tags.some((tag) => extTags.includes(tag)))
                    return false;
            }
            return true;
        });
    }
    /**
     * Group extensions by category
     */
    static groupByCategory(extensions) {
        return extensions.reduce((groups, ext) => {
            const category = ext.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(ext);
            return groups;
        }, {});
    }
    /**
     * Get extension statistics
     */
    static getStats(extensions) {
        const stats = {
            total: extensions.length,
            byCategory: {},
            byStatus: {},
        };
        extensions.forEach((ext) => {
            stats.byCategory[ext.category] = (stats.byCategory[ext.category] || 0) + 1;
            stats.byStatus[ext.status] = (stats.byStatus[ext.status] || 0) + 1;
        });
        return stats;
    }
}
exports.ExtensionUtils = ExtensionUtils;
//# sourceMappingURL=extension-utils.js.map