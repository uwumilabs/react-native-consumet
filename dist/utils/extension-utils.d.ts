import { AsianLoad, Filemoon, GogoCDN, MixDrop, Mp4Player, Mp4Upload, RapidCloud, StreamHub, StreamLare, StreamSB, StreamTape, StreamWish, VidMoly, VizCloud, VidHide, Voe, MegaUp } from '../extractors';
import type { ExtractorContext } from '../models';
export declare const defaultAxios: import("axios").AxiosInstance;
export declare const defaultExtractorContext: ExtractorContext;
export declare const defaultStaticExtractors: {
    AsianLoad: typeof AsianLoad;
    Filemoon: typeof Filemoon;
    GogoCDN: typeof GogoCDN;
    Kwik: (ctx: ExtractorContext) => import("../models").IVideoExtractor;
    MixDrop: typeof MixDrop;
    Mp4Player: typeof Mp4Player;
    Mp4Upload: typeof Mp4Upload;
    RapidCloud: typeof RapidCloud;
    MegaCloud: (ctx: ExtractorContext) => import("../models").IVideoExtractor;
    StreamHub: typeof StreamHub;
    StreamLare: typeof StreamLare;
    StreamSB: typeof StreamSB;
    StreamTape: typeof StreamTape;
    StreamWish: typeof StreamWish;
    VidMoly: typeof VidMoly;
    VizCloud: typeof VizCloud;
    VidHide: typeof VidHide;
    Voe: typeof Voe;
    MegaUp: typeof MegaUp;
};
export declare const animeProviders: {
    Zoro: typeof import("../providers/anime/zoro/zoro").Zoro;
    AnimePahe: typeof import("../providers/anime/animepahe/animepahe").AnimePahe;
};
export declare const movieProviders: {
    HiMovies: typeof import("../providers/movies/himovies/himovies").default;
    MultiMovies: typeof import("../providers/movies/multimovies").default;
    DramaCool: typeof import("../providers/movies/dramacool").default;
    MultiStream: typeof import("../providers/movies/multistream").default;
};
declare const metaProviders: {
    Anilist: typeof import("../providers/meta/anilist").default;
    TMDB: typeof import("../providers/meta/tmdb").default;
    MAL: typeof import("../providers/meta/mal").default;
};
export declare const extractors: {
    GogoCDN: typeof GogoCDN;
    StreamSB: typeof StreamSB;
    StreamTape: typeof StreamTape;
    MixDrop: typeof MixDrop;
    Kwik: (ctx: ExtractorContext) => import("../models").IVideoExtractor;
    RapidCloud: typeof RapidCloud;
    StreamWish: typeof StreamWish;
    Filemoon: typeof Filemoon;
    Voe: typeof Voe;
    AsianLoad: typeof AsianLoad;
    StreamLare: typeof StreamLare;
    VidMoly: typeof VidMoly;
    MegaCloud: (ctx: ExtractorContext) => import("../models").IVideoExtractor;
};
export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
export type Extractor = keyof typeof extractors;
export {};
//# sourceMappingURL=extension-utils.d.ts.map