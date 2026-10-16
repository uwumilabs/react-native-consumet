import type { IVideoExtractor, ExtractorContextConfig } from '../models';
import type { ExtensionRegistryData, ExtractorInfo } from '../models/extension-manifest';
import extensionRegistry from '../extension-registry.json';
import { type ExecuteCodeOptions, type IntegrityOptions } from './extension-integrity';
export declare class ExtractorManager {
    private loadedExtractors;
    private compiledExtractors;
    private extractorRegistry;
    private staticExtractors;
    private extractorContext;
    private integrityOptions;
    private extractorAliases;
    /**
     * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
     */
    constructor(registry: ExtensionRegistryData | typeof extensionRegistry, extractorConfig?: ExtractorContextConfig, integrityOptions?: IntegrityOptions);
    /**
     * Initialize static extractors as fallbacks
     */
    private initializeStaticExtractors;
    /**
     * Index the validated registry extractors (and their aliases) by lowercased name
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
     * Load an extractor by server name or extractor ID from the registry, or the bundled version
     * when the registry has none or its code can't be used. Always an instance built with this
     * manager's extractor context.
     * Handles server names with suffixes like 'megacloud-hd-1', 'kwik-pahe', etc.
     * Also resolves aliases like 'upcloud' -> 'megacloud', 'akcloud' -> 'megacloud'
     */
    loadExtractor(extractorId: string): Promise<IVideoExtractor>;
    /**
     * Forget a loaded extractor and its compiled code, so the next load fetches and runs it again.
     * Takes the same names as loadExtractor ('megacloud-hd-1', 'MegaCloud', 'upcloud').
     */
    invalidate(extractorId: string): void;
    /** The bundled version of an extractor, built with this manager's context */
    private createStaticExtractor;
    /**
     * Fetch and run the registry version of an extractor, falling back to the bundled version
     */
    private fetchExtractor;
    /**
     * Execute extractor code and create instance.
     * The code must match `metadata.sha256` unless `options.skipIntegrity` is set. Verified code is
     * compiled once per extractor name and sha256; each call returns a new instance.
     *
     * @throws RegistryError before running anything if the entry needs a newer extension context
     * @throws IntegrityError before running anything if the hash or extractor name is invalid
     */
    executeExtractorCode(code: string, metadata: ExtractorInfo, options?: ExecuteCodeOptions): Promise<IVideoExtractor>;
    /**
     * Create execution context for extractor code
     */
    private createExecutionContext;
}
export default ExtractorManager;
//# sourceMappingURL=ExtractorManager.d.ts.map