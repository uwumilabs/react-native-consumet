/**
 * This file maps provider keys to their classes for ProviderManager.
 *
 * We use lazy getters to break circular dependencies:
 * - Meta providers (like Anilist) import anime providers (like AnimeKai)
 * - AnimeKai imports extractors directly from extractors/
 * - Utils no longer re-exports extractors (breaking one part of the circle)
 * - Lazy loading breaks the other part at runtime
 */
import type { IAnimeProvider, IMovieProvider } from '../models/types';
export declare const animeProviders: {
    readonly Zoro: any;
    readonly AnimePahe: any;
    readonly AnimeKai: any;
    readonly AniKoto: any;
};
export declare const movieProviders: {
    readonly HiMovies: any;
    readonly MultiMovies: any;
    readonly MultiStream: any;
    readonly YFlix: any;
    readonly VegaMovies: any;
    readonly NetflixMirror: any;
    readonly PrimeMirror: any;
    readonly DisneyMirror: any;
};
declare const metaProviders: {
    readonly Anilist: any;
    readonly TMDB: any;
    readonly MAL: any;
};
/** @deprecated Class keys of the bundled providers; registry ids are lowercase, use `AnimeProviderId`. */
export type AnimeProvider = keyof typeof animeProviders;
/** @deprecated Class keys of the bundled providers; registry ids are lowercase, use `MovieProviderId`. */
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
/** Registry ids of the providers in the bundled registry. */
export type KnownAnimeProviderId = 'animepahe' | 'animekai' | 'anikoto' | 'anineko';
export type KnownMovieProviderId = 'multimovies' | 'yflix' | 'vegamovies' | 'netflixmirror' | 'primemirror' | 'disneymirror';
/** Any registry id; known ids autocomplete, and providers added to a registry later still type-check. */
export type AnimeProviderId = KnownAnimeProviderId | (string & {});
export type MovieProviderId = KnownMovieProviderId | (string & {});
/** The provider type for an id: anime or movie when the id says so, otherwise either. */
export type ProviderInstanceOf<T> = T extends AnimeProvider | KnownAnimeProviderId ? IAnimeProvider : T extends MovieProvider | KnownMovieProviderId ? IMovieProvider : IAnimeProvider | IMovieProvider;
export {};
//# sourceMappingURL=provider-maps.d.ts.map