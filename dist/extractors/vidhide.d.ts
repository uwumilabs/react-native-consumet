import { VideoExtractor, type IVideo } from '../models';
declare class VidHide extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
export default VidHide;
//# sourceMappingURL=vidhide.d.ts.map