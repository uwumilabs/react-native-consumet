import type { ExtractorInfo } from '../models/extension-manifest';
import { type ExtractorContextConfig } from './create-extractor-context';
export declare class ExtractorManager {
    private loadedExtractors;
    private extractorRegistry;
    private staticExtractors;
    private extractorContext;
    constructor(config?: ExtractorContextConfig);
    /**
     * Initialize static extractors as fallbacks
     */
    private initializeStaticExtractors;
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