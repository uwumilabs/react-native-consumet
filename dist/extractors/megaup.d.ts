import { type ISource, type IVideo, VideoExtractor } from '../models';
export declare class MegaUp extends VideoExtractor {
    protected serverName: string;
    protected sources: IVideo[];
    protected apiBase: string;
    constructor();
    GenerateToken: (n: string) => Promise<string>;
    DecodeIframeData: (n: string) => Promise<{
        url: string;
        skip: {
            intro: [number, number];
            outro: [number, number];
        };
    }>;
    Decode: (n: string) => Promise<{
        sources: {
            file: string;
        }[];
        tracks: {
            kind: string;
            file: string;
        }[];
        download: string;
    }>;
    extract: (videoUrl: URL) => Promise<ISource>;
}
export default MegaUp;
//# sourceMappingURL=megaup.d.ts.map