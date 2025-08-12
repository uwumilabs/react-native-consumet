import type { IVideoExtractor, StreamingServers, ExtractorContextConfig } from '../models';
import type { ExtractorInfo } from '../models/extension-manifest';
export declare class ExtractorManager {
    private loadedExtractors;
    private extractorRegistry;
    private staticExtractors;
    private extractorContext;
    constructor(extractorConfig?: ExtractorContextConfig);
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
    getExtractorMetadata(extractorId: StreamingServers): ExtractorInfo;
    /**
     * Load an extractor by ID from the registry
     */
    loadExtractor(extractorId: StreamingServers): Promise<any>;
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