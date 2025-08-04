import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class VidCloud extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL, _?: boolean, referer?: string) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
export default VidCloud;
//# sourceMappingURL=vidcloud.d.ts.map