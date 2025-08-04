import { VideoExtractor, type IVideo, type ISubtitle } from '../models';
declare class AsianLoad extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private readonly keys;
    extract: (videoUrl: URL) => Promise<{
        sources: IVideo[];
    } & {
        subtitles: ISubtitle[];
    }>;
    private generateEncryptedAjaxParams;
    private decryptAjaxData;
}
export default AsianLoad;
//# sourceMappingURL=asianload.d.ts.map