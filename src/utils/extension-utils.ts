/**
 * Basic utilities for extension management that app developers can use
 * App developers handle their own caching, storage, downloading, and update mechanisms
 */

import type { ExtensionManifest, ExtensionRegistry } from '../models/extension-manifest';

/**
 * Essential utility functions for working with extensions
 */
export class ExtensionUtils {
  /**
   * Validate extension manifest format
   */
  static validateManifest(manifest: any): manifest is ExtensionManifest {
    if (!manifest || typeof manifest !== 'object') return false;

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
  static compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }

    return 0;
  }

  /**
   * Check if extension version satisfies minimum requirement
   */
  static satisfiesMinVersion(extensionVersion: string, minVersion: string): boolean {
    return this.compareVersions(extensionVersion, minVersion) >= 0;
  }

  /**
   * Generate extension cache key
   */
  static getCacheKey(extensionId: string, factoryName: string): string {
    return `ext:${extensionId}:${factoryName}`;
  }

  /**
   * Filter extensions by criteria
   */
  static filterExtensions(
    extensions: ExtensionManifest[],
    criteria: {
      category?: string;
      status?: string;
      nsfw?: boolean;
      query?: string;
      tags?: string[];
    }
  ): ExtensionManifest[] {
    return extensions.filter((ext) => {
      if (criteria.category && ext.category !== criteria.category) return false;
      if (criteria.status && ext.status !== criteria.status) return false;
      if (criteria.nsfw !== undefined && ext.nsfw !== criteria.nsfw) return false;

      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const searchText = `${ext.name} ${ext.description}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        const extTags = ext.tags || [];
        if (!criteria.tags.some((tag) => extTags.includes(tag))) return false;
      }

      return true;
    });
  }

  /**
   * Group extensions by category
   */
  static groupByCategory(extensions: ExtensionManifest[]): Record<string, ExtensionManifest[]> {
    return extensions.reduce(
      (groups, ext) => {
        const category = ext.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(ext);
        return groups;
      },
      {} as Record<string, ExtensionManifest[]>
    );
  }

  /**
   * Get extension statistics
   */
  static getStats(extensions: ExtensionManifest[]): {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const stats = {
      total: extensions.length,
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    extensions.forEach((ext) => {
      stats.byCategory[ext.category] = (stats.byCategory[ext.category] || 0) + 1;
      stats.byStatus[ext.status] = (stats.byStatus[ext.status] || 0) + 1;
    });

    return stats;
  }
}
