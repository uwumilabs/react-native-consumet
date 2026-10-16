import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
export declare class StreamSB extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    private readonly host2;
    private PAYLOAD;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL, isAlt?: boolean) => Promise<IVideo[]>;
    private addSources;
}
//# sourceMappingURL=streamsb.d.ts.map