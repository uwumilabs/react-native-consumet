import type { ProviderContext } from '../../../models';
import { NetMirrorParser } from './netmirror-parser';
export declare class NetflixMirror extends NetMirrorParser {
    /**
     * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
     * @param customBaseURL site URL to use instead of the default (optional)
     */
    constructor(ctx?: ProviderContext, customBaseURL?: string);
    /** The older form, without a context. */
    constructor(customBaseURL?: string);
}
//# sourceMappingURL=netflixmirror.d.ts.map