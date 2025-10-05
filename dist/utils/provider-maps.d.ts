/**
 * This file maps provider keys to their classes for ProviderManager.
 *
 * We use lazy getters to break circular dependencies:
 * - Meta providers (like Anilist) import anime providers (like AnimeKai)
 * - AnimeKai imports extractors directly from extractors/
 * - Utils no longer re-exports extractors (breaking one part of the circle)
 * - Lazy loading breaks the other part at runtime
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