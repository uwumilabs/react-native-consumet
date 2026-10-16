import { VideoExtractor, type IVideo, type ISubtitle, type ExtractorContext } from '../models';
export declare class Mp4Player extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly domains;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
//# sourceMappingURL=mp4player.d.ts.map