import { AsianLoad, Filemoon, GogoCDN, Kwik, MixDrop, Mp4Player, Mp4Upload, RapidCloud, StreamHub, StreamLare, StreamSB, StreamTape, StreamWish, VidMoly, VizCloud, VidHide, Voe, MegaUp } from '../extractors';
import type { ExtractorContext } from '../models';
export declare const defaultAxios: import("axios").AxiosInstance;
export declare const extractorContext: ExtractorContext;
export declare const defaultStaticExtractors: {
    AsianLoad: typeof AsianLoad;
    Filemoon: typeof Filemoon;
    GogoCDN: typeof GogoCDN;
    Kwik: typeof Kwik;
    MixDrop: typeof MixDrop;
    Mp4Player: typeof Mp4Player;
    Mp4Upload: typeof Mp4Upload;
    RapidCloud: typeof RapidCloud;
    MegaCloud: (ctx?: ExtractorContext) => import("../models").IVideoExtractor;
    StreamHub: typeof StreamHub;
    StreamLare: typeof StreamLare;
    StreamSB: typeof StreamSB;
    StreamTape: typeof StreamTape;
    StreamWish: typeof StreamWish;
    VidCloud: (ctx?: ExtractorContext) => import("../models").IVideoExtractor;
    VidMoly: typeof VidMoly;
    VizCloud: typeof VizCloud;
    VidHide: typeof VidHide;
    Voe: typeof Voe;
    MegaUp: typeof MegaUp;
};
//# sourceMappingURL=extension-utils.d.ts.map