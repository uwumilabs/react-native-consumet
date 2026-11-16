import type { ExtractorFactory, IVideoExtractor } from '../models';
import type { BundledRegistry, ExtensionRegistryData, ExtractorInfo } from '../models/extension-manifest';
import { type ExtractorContextConfig } from './create-extractor-context';
import type { ExecuteCodeOptions, IntegrityOptions } from './extension-integrity';
export declare class ExtractorManager {
    private loads;
    private compiled;
    private registry;
    private bundled;
    private context;
    private aliases;
    /**
     * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
     */
    constructor(registry: ExtensionRegistryData | BundledRegistry, extractorConfig?: ExtractorContextConfig, integrityOptions?: IntegrityOptions);
    /**
     * The registry entry for a server name or extractor name, case-insensitive: 'MegaCloud',
     * 'megacloud-hd-1', or an alias like 'upcloud'.
     */
    getExtractorMetadata(extractorId: string): ExtractorInfo | undefined;
    /**
     * Resolve a server name to its extractor name, lowercased: the longest registry extractor name or
     * alias the server name starts with (bundled extractor names are a fallback). 'megacloud-hd-1' ->
     * 'megacloud', 'upcloud' -> 'megacloud', 'newhost-hd-1' -> 'newhost' when the registry has NewHost.
     */
    extractBaseExtractorName(serverName: string): string | null;
    /**
     * An extractor for a server or extractor name, built with this manager's context: the registry
     * version, or the bundled one when the registry has none or its code can't be used. Loads are
     * shared by every name the extractor serves ('megacloud-hd-1', 'MegaCloud', 'upcloud').
     *
     * @throws RegistryError if the registry entry needs a newer extension context
     */
    loadExtractor(extractorId: string): Promise<IVideoExtractor>;
    /** The factory loadExtractor builds its instance with, to build an extractor with another context. */
    loadExtractorFactory(extractorId: string): Promise<ExtractorFactory>;
    /**
     * Forget a loaded extractor and its compiled code, so the next load fetches and runs it again.
     * Takes the same names as loadExtractor ('megacloud-hd-1', 'MegaCloud', 'upcloud').
     */
    invalidate(extractorId: string): void;
    /**
     * Run registry code for an extractor and build it with this manager's context. The code must match
     * `metadata.sha256` unless `options.skipIntegrity` is set.
     *
     * @throws RegistryError before running anything if the entry needs a newer extension context
     * @throws IntegrityError before running anything if the hash or extractor name is invalid
     */
    executeExtractorCode(code: string, metadata: ExtractorInfo, options?: ExecuteCodeOptions): Promise<IVideoExtractor>;
    private nameOf;
    private load;
    private loaded;
    /** The registry version of an extractor, falling back to the bundled one when it can't be used. */
    private fetchFactory;
    private compileExtractor;
}
export default ExtractorManager;
//# sourceMappingURL=ExtractorManager.d.ts.map