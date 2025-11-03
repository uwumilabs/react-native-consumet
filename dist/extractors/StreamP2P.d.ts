import type { IVideo, ISource } from '../models';
import VideoExtractor from '../models/video-extractor';
declare class StreamP2P extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    extract(videoUrl: URL): Promise<IVideo[] | ISource>;
}
export default StreamP2P;
//# sourceMappingURL=streamp2p.d.ts.map