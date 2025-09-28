/**
 * This file is used to map the providers to their respective keys.
 * It is a separate file to avoid circular dependencies between the providers and the utils.
 * The circular dependency is caused by the fact that the providers need to be imported in the utils
 * to be used in the ProviderManager, but the providers also need to import the utils to use the
 * createProviderContext function.
 */
export declare const animeProviders: {
    Zoro: typeof import("../providers/anime/zoro/zoro").Zoro;
    AnimePahe: typeof import("../providers/anime/animepahe/animepahe").AnimePahe;
};
export declare const movieProviders: {
    HiMovies: typeof import("../providers/movies/himovies/himovies").default;
    MultiMovies: typeof import("../providers/movies/multimovies").default;
    MultiStream: typeof import("../providers/movies/multistream").default;
};
declare const metaProviders: {
    Anilist: typeof import("../providers/meta/anilist").default;
    TMDB: typeof import("../providers/meta/tmdb").default;
    MAL: typeof import("../providers/meta/mal").default;
};
export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
export {};
//# sourceMappingURL=provider-maps.d.ts.map