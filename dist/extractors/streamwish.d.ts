import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
import type { PolyURL } from '../utils';
declare class StreamWish extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: PolyURL, referer?: string) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
}
export default StreamWish;
//# sourceMappingURL=streamwish.d.ts.map