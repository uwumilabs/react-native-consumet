import { VideoExtractor, type IVideo } from '../models';
declare class Kwik extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly host;
    extract: (videoUrl: URL) => Promise<IVideo[]>;
}
export default Kwik;
//# sourceMappingURL=kwik.d.ts.map