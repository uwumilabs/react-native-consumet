/**
 * Provider registry — single source of truth for all available providers.
 *
 * Add / remove entries here and the UI picker updates automatically.
 * Never hardcode provider instances in screens; import from here instead.
 */

import { ANIME, MOVIES, META } from 'react-native-consumet';

// ── Anime ─────────────────────────────────────────────────────────────────────

export type AnimeProviderDef = {
  key: string;
  label: string;
  /** Short emoji shown in the picker and header chip */
  emoji: string;
  /** true → show SUB / DUB toggle in the detail sheet */
  isDubSeparate: boolean;
  /** Factory — creates a fresh provider instance */
  make: () => InstanceType<typeof ANIME.AniNeko>; // structural; all parsers share the same API
};

export const ANIME_PROVIDERS: AnimeProviderDef[] = [
  {
    key: 'anineko',
    label: 'AniNeko',
    emoji: '🐱',
    isDubSeparate: true,
    make: () => new ANIME.AniNeko() as any,
  },
  {
    key: 'animekai',
    label: 'AnimeKai',
    emoji: '⚡',
    isDubSeparate: true,
    make: () => new ANIME.AnimeKai() as any,
  },
  {
    key: 'anikoto',
    label: 'AniKoto',
    emoji: '🌸',
    isDubSeparate: true,
    make: () => new ANIME.AniKoto() as any,
  },
  {
    key: 'zoro',
    label: 'Zoro',
    emoji: '⚔️',
    isDubSeparate: true,
    make: () => new ANIME.Zoro() as any,
  },
  {
    key: 'animepahe',
    label: 'AnimePahe',
    emoji: '🦋',
    isDubSeparate: true,
    make: () => new ANIME.AnimePahe() as any,
  },
  {
    key: 'reanime',
    label: 'ReAnime',
    emoji: '🔁',
    isDubSeparate: false,
    make: () => new ANIME.ReAnime() as any,
  },
];

// ── Movies / TV ───────────────────────────────────────────────────────────────

export type MovieProviderDef = {
  key: string;
  label: string;
  emoji: string;
  /** Creates the raw movie parser that gets wrapped by META.TMDB */
  makeInner: () => InstanceType<typeof MOVIES.VegaMovies>;
};

const TMDB_KEY = '5201b54eb0968700e693a30576d7d4dc';

export const MOVIE_PROVIDERS: MovieProviderDef[] = [
  {
    key: 'vegamovies',
    label: 'VegaMovies',
    emoji: '🎬',
    makeInner: () => new MOVIES.VegaMovies() as any,
  },
  {
    key: 'himovies',
    label: 'HiMovies',
    emoji: '🍿',
    makeInner: () => new MOVIES.HiMovies() as any,
  },
  {
    key: 'yflix',
    label: 'YFlix',
    emoji: '📺',
    makeInner: () => new MOVIES.YFlix() as any,
  },
  {
    key: 'multimovies',
    label: 'MultiMovies',
    emoji: '🎞️',
    makeInner: () => new MOVIES.MultiMovies() as any,
  },
  {
    key: 'netflixmirror',
    label: 'NetflixMirror',
    emoji: '🎭',
    makeInner: () => new MOVIES.NetflixMirror() as any,
  },
];

/** Wraps a movie provider in META.TMDB for normalised TMDB metadata + IDs */
export const makeTmdb = (def: MovieProviderDef) => new META.TMDB(TMDB_KEY, def.makeInner() as any) as any;
