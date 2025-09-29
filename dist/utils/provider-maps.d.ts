/**
 * This file is used to map the providers to their respective keys.
 * It is a separate file to avoid circular dependencies between the providers and the utils.
 * The circular dependency is caused by the fact that the providers need to be imported in the utils
 * to be used in the ProviderManager, but the providers also need to import the utils to use the
 * createProviderContext function.
 */
export declare const animeProviders: {
    readonly Zoro: any;
    readonly AnimePahe: any;
};
export declare const movieProviders: {
    readonly HiMovies: any;
    readonly MultiMovies: any;
    readonly MultiStream: any;
};
declare const metaProviders: {
    readonly Anilist: any;
    readonly TMDB: any;
    readonly MAL: any;
};
export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
export {};
//# sourceMappingURL=provider-maps.d.ts.map