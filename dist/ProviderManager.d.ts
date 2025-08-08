import { type ProviderContextConfig } from './utils/create-provider-context';
import type { ProviderContext } from './models/provider-context';
import { type IAnimeInfo, type IAnimeResult, type IMovieResult, type ISearch, type ISource } from './models';
/**
 * Personal Provider Manager for Zoro
 *
 * Features:
 * - Loads and executes zoro.js provider code
 * - Provides direct access to all original zoro methods
 * - Includes standardized API for compatibility
 * - Uses your project's context utilities
 * - Supports both React Native and Node.js environments
 */
export declare class ProviderManager {
    private zoroProviderCode;
    private zoroInstance;
    private providerContext;
    private isInitialized;
    private customModels;
    constructor(config?: ProviderContextConfig);
    /**
     * Load zoro.js provider code from file or URL
     */
    loadProviderCode(source: string): Promise<void>;
    /**
     * Load provider code directly from a string
     */
    loadProviderCodeFromString(code: string): void;
    /**
     * Set custom models directly (avoids need to rewrite types/enums)
     * Use this to pass your actual models folder content
     */
    setCustomModels(customModels: Record<string, any>): void;
    /**
     * Load models from your models folder automatically
     */
    loadModelsFromPath(modelsPath?: string): Promise<void>; /**
     * Create execution context with all necessary dependencies
     */
    private createExecutionContext;
    /**
     * Create models mock for zoro.js - now using actual imported models
     */
    private createModelsMock;
    /**
     * Create __awaiter helper for older compiled code
     */
    private createAwaiterHelper;
    /**
     * Execute provider code and initialize zoro instance
     */
    initializeProvider(): Promise<void>;
    /**
     * Ensure provider is initialized
     */
    private ensureInitialized;
    /**
     * Search for anime using zoro's search method
     */
    search(query: string, page?: number): Promise<ISearch<IAnimeResult | IMovieResult>>;
    /**
     * Get detailed anime information
     */
    fetchAnimeInfo(id: string): Promise<IAnimeInfo>;
    /**
     * Get episode streaming sources
     */
    fetchEpisodeSources(episodeId: string, server?: string, subOrDub?: string): Promise<ISource>;
    /**
     * Get provider context
     */
    getProviderContext(): ProviderContext;
    /**
     * Check if provider is ready
     */
    isReady(): boolean;
}
export default ProviderManager;
//# sourceMappingURL=ProviderManager.d.ts.map