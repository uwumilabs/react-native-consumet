import type { IVideoExtractor, ExtractorContextConfig } from '../models';
import type { ExtractorInfo } from '../models/extension-manifest';
import extensionRegistry from '../extension-registry.json';
import { type ExecuteCodeOptions, type IntegrityOptions } from './extension-integrity';
export declare class ExtractorManager {
    private loadedExtractors;
    private extractorRegistry;
    private staticExtractors;
    private extractorContext;
    private integrityOptions;
    private extractorAliases;
    constructor(registry: typeof extensionRegistry, extractorConfig?: ExtractorContextConfig, integrityOptions?: IntegrityOptions);
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
     * Resolve a server name to its extractor name: the longest registry extractor name or alias
     * the server name starts with (bundled extractor names are a fallback), lowercased.
     * Examples:
     * - 'megacloud-hd-1' -> 'megacloud'
     * - 'kwik-pahe' -> 'kwik'
     * - 'upcloud' -> 'megacloud' (alias)
     * - 'newhost-hd-1' -> 'newhost' (any extractor present in the registry)
     */
    extractBaseExtractorName(serverName: string): string | null;
    /**
     * Load an extractor by ID from the registry
     * Handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
     * Also resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
     */
    loadExtractor(extractorId: string): Promise<IVideoExtractor>;
    /**
     * Execute extractor code and create instance.
     * The code must match `metadata.sha256` unless `options.skipIntegrity` is set.
     *
     * @throws IntegrityError before running anything if the hash or extractor name is invalid
     */
    executeExtractorCode(code: string, metadata: ExtractorInfo, options?: ExecuteCodeOptions): Promise<IVideoExtractor>;
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