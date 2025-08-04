import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class StreamHub extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
export default StreamHub;
//# sourceMappingURL=streamhub.d.ts.map