import { type ISource, type IVideo, VideoExtractor } from '../models';
export declare class MegaUp extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    private homeKeys;
    private megaKeys;
    private kaiKeysReady;
    constructor();
    private loadKAIKEYS;
    private keysChar;
    GenerateToken: (n: string) => string;
    DecodeIframeData: (n: string) => string;
    Decode: (n: string) => string;
    extract: (videoUrl: URL) => Promise<ISource>;
}
//# sourceMappingURL=megaup.d.ts.map