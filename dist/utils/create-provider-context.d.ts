import { type ExtractorFactory, type ProviderContext } from '../models';
import * as BundledExtractors from '../extractors';
import { type ExtractorContextConfig } from './create-extractor-context';
import type { ExtractorManager } from './ExtractorManager';
export interface ProviderContextConfig extends ExtractorContextConfig {
    /** Extractors to use instead of the bundled and registry ones, by name. */
    extractors?: Record<string, ExtractorFactory>;
    /**
     * Supplies registry versions of extractors: `ctx.extractors.X` runs X's hash-verified registry
     * version when the manager's registry lists X, falling back to the bundled X.
     */
    extractorManager?: ExtractorManager;
}
/** The extractors the library bundles, by name. */
export declare const defaultExtractors: typeof BundledExtractors;
export declare function createProviderContext(config?: ProviderContextConfig): ProviderContext;
export default createProviderContext;
//# sourceMappingURL=create-provider-context.d.ts.map