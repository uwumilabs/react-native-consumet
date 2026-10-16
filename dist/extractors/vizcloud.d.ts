import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
export declare class VizCloud extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    private keys;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL, vizCloudHelper: string, apiKey: string) => Promise<IVideo[]>;
}
//# sourceMappingURL=vizcloud.d.ts.map