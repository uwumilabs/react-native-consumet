import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class RapidCloud extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly fallbackKey;
    private readonly host;
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
    private captcha;
}
export default RapidCloud;
//# sourceMappingURL=rapidcloud.d.ts.map