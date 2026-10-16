import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
export declare class VidMoly extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
//# sourceMappingURL=vidmoly.d.ts.map