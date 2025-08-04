import { VideoExtractor, type ExtractorContext, type IVideo, type ISource } from '../../models';
export declare class MegaCloud extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private ctx;
    constructor(ctx: ExtractorContext);
    extract(embedIframeURL: URL, referer?: string): Promise<ISource>;
}
//# sourceMappingURL=index.d.ts.map