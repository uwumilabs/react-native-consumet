import { VideoExtractor, type IVideo } from '../models';
declare class StreamTape extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
export default StreamTape;
//# sourceMappingURL=streamtape.d.ts.map