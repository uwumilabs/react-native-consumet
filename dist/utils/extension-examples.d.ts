/**
 * Simple example usage of Extension Registry utilities for app developers
 *
 * This shows the basic utilities provided. App developers should implement:
 * - Caching, storage, downloading, security, updates
 */
/**
 * Basic extension manager usage example
 */
export declare const BasicUsage: {
    setup(): Promise<any>;
    utilities(): Promise<{
        validExtensions: any;
        stableExtensions: any;
        grouped: any;
        stats: any;
        hasUpdate: boolean;
    }>;
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
//# sourceMappingURL=extension-examples.d.ts.map