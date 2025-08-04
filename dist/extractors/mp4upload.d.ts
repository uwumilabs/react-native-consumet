import { VideoExtractor, type IVideo } from '../models';
declare class Mp4Upload extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
export default Mp4Upload;
//# sourceMappingURL=mp4upload.d.ts.map