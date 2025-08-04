import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class Mp4Player extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly domains;
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
export default Mp4Player;
//# sourceMappingURL=mp4player.d.ts.map