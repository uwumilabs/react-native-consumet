import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class StreamWish extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL, referer?: string) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
export default StreamWish;
//# sourceMappingURL=streamwish.d.ts.map