import type { IVideoExtractor, ExtractorContextConfig } from '../models';
import { StreamingServers } from '../models';
import type { ExtractorInfo } from '../models/extension-manifest';
import extensionRegistry from '../extension-registry.json';
export declare class ExtractorManager {
    private loadedExtractors;
    private extractorRegistry;
    private staticExtractors;
    private extractorContext;
    private extractorAliases;
    constructor(registry: typeof extensionRegistry, extractorConfig?: ExtractorContextConfig);
    /**
     * Initialize static extractors as fallbacks
     */
    private initializeStaticExtractors;
    /**
     * Load extractors from the unified extension registry
     */
    private loadRegistry;
    /**
     * @param extractorId server name or extractor ID (case-insensitive) like 'megacloud' or 'MegaCloud'
     * @returns ExtractorInfo or undefined if not found
     * - Also handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
     * - Resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
     */
    getExtractorMetadata(extractorId: string): ExtractorInfo | undefined;
    /**
     * Extract the base extractor name from server names with suffixes and resolve aliases
     * Examples:
     * - 'megacloud-hd-1' -> 'megacloud'
     * - 'kwik-pahe' -> 'kwik'
     * - 'upcloud' -> 'megacloud' (alias resolved)
     * - 'akcloud' -> 'megacloud' (alias resolved)
     * - 'MegaCloud' -> 'megacloud'
     */
    extractBaseExtractorName(serverName: string): string | null;
    /**
     * Load an extractor by ID from the registry
     * Handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
     * Also resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
     */
    loadExtractor(extractorId: StreamingServers): Promise<IVideoExtractor>;
    /**
     * Execute extractor code and create instance
     */
    executeExtractorCode(code: string, metadata: ExtractorInfo): Promise<IVideoExtractor>;
    /**
     * Create models context
     */
    private createModelsContext;
    /**
     * Create execution context for extractor code
     */
    private createExecutionContext;
}
export default ExtractorManager;
//# sourceMappingURL=ExtractorManager.d.ts.map