import { type ProviderContextConfig } from './create-provider-context';
import type { ExtractorInfo } from '../models/extension-manifest';
export declare class ExtractorManager {
    private providerContext;
    private loadedExtractors;
    private extractorRegistry;
    private staticExtractors;
    constructor(config?: ProviderContextConfig);
    /**
     * Initialize static extractors as fallbacks
     */
    private initializeStaticExtractors;
    /**
     * Create extractor context for context-aware extractors
     */
    private createExtractorContext;
    /**
     * Load extractors from the unified extension registry
     */
    private loadExtractorsFromRegistry;
    /**
     * Get extractor metadata by ID
     */
    getExtractorMetadata(extractorId: string): ExtractorInfo | null;
    /**
     * Load an extractor by ID from the registry
     */
    loadExtractor(extractorId: string): Promise<any>;
    /**
     * Execute extractor code and create instance
     */
    private executeExtractorCode;
    /**
     * Create execution context for extractor code
     */
    private createExecutionContext;
}
export default ExtractorManager;
//# sourceMappingURL=ExtractorManager.d.ts.map