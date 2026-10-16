import { type IVideo, VideoExtractor, type ExtractorContext } from '../models';
/**
 * work in progress
 */
export declare class Filemoon extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
//# sourceMappingURL=filemoon.d.ts.map