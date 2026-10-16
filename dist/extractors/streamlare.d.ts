import { VideoExtractor, type ExtractorContext, type IVideo, type ISource } from '../models';
export declare class StreamLare extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    private readonly regex;
    private readonly USER_AGENT;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract(videoUrl: URL, userAgent?: string): Promise<IVideo[] | ISource>;
}
//# sourceMappingURL=streamlare.d.ts.map