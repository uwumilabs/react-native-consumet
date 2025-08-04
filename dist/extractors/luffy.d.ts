import { VideoExtractor, type IVideo } from '../models';
declare class Luffy extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
export default Luffy;
//# sourceMappingURL=luffy.d.ts.map