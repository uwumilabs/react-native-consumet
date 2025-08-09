/**
 * Basic utilities for extension management that app developers can use
 * App developers handle their own caching, storage, downloading, and update mechanisms
 */
import type { ExtensionManifest } from '../models/extension-manifest';
/**
 * Essential utility functions for working with extensions
 */
export declare class ExtensionUtils {
    /**
     * Validate extension manifest format
     */
    static validateManifest(manifest: any): manifest is ExtensionManifest;
    /**
     * Compare extension versions (basic semver comparison)
     */
    static compareVersions(version1: string, version2: string): number;
    /**
     * Check if extension version satisfies minimum requirement
     */
    static satisfiesMinVersion(extensionVersion: string, minVersion: string): boolean;
    /**
     * Generate extension cache key
     */
    static getCacheKey(extensionId: string, factoryName: string): string;
    /**
     * Filter extensions by criteria
     */
    static filterExtensions(extensions: ExtensionManifest[], criteria: {
        category?: string;
        status?: string;
        nsfw?: boolean;
        query?: string;
        tags?: string[];
    }): ExtensionManifest[];
    /**
     * Group extensions by category
     */
    static groupByCategory(extensions: ExtensionManifest[]): Record<string, ExtensionManifest[]>;
    /**
     * Get extension statistics
     */
    static getStats(extensions: ExtensionManifest[]): {
        total: number;
        byCategory: Record<string, number>;
        byStatus: Record<string, number>;
    };
}
//# sourceMappingURL=extension-utils.d.ts.map