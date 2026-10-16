import { VideoExtractor, type IVideo, type ISubtitle, type ExtractorContext } from '../models';
export declare class GogoCDN extends VideoExtractor {
    private readonly ctx;
    protected serverName: string;
    protected sources: IVideo[];
    private readonly keys;
    private referer;
    /** @param ctx extractor context; requests go through its axios (default: the library's) */
    constructor(ctx?: ExtractorContext);
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
    private addSources;
    private generateEncryptedAjaxParams;
    private decryptAjaxData;
}
//# sourceMappingURL=gogocdn.d.ts.map