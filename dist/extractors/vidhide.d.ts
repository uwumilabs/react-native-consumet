import { VideoExtractor, type IVideo } from '../models';
import type { PolyURL } from '../utils';
declare class VidHide extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    extract: (videoUrl: PolyURL) => Promise<IVideo[]>;
}
export default VidHide;
//# sourceMappingURL=vidhide.d.ts.map