import { VideoExtractor, type IVideo, type ISubtitle, type ExtractorContext } from '../models';
export declare class RapidCloud extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly fallbackKey;
    private readonly host;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
    private captcha;
}
//# sourceMappingURL=rapidcloud.d.ts.map