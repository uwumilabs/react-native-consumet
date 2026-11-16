/**
 * The providers the Anime, Movies and Manga tabs offer: every provider class in the library's
 * ANIME, MOVIES and MANGA objects, so a provider the library adds shows up here on its own.
 */

import { useState } from 'react';
import {
  ANIME,
  AnimeParser,
  MANGA,
  META,
  MOVIES,
  MovieParser,
  type IAnimeProvider,
  type IMangaChapterPage,
  type IMangaInfo,
  type IMangaResult,
  type IMovieProvider,
  type ISearch,
} from 'react-native-consumet';

type ProviderDef<P> = {
  /** The provider's key in the library object, e.g. 'AnimePahe' */
  key: string;
  label: string;
  emoji: string;
  make: () => P;
};

type ProviderClass<P> = new () => P;

/** The keys of the classes in a library object, so a renamed or removed provider fails to compile. */
type ClassKey<L> = {
  [K in keyof L]: L[K] extends abstract new (...args: never[]) => unknown ? K : never;
}[keyof L] &
  string;

const pickProvider = <P>(def: ProviderDef<P>) => ({ def, provider: def.make() });

/**
 * A tab's provider: the first entry's at first. `select(key)` switches to a new instance of another
 * entry; picking the current one keeps it.
 */
export function useProviderChoice<P>(defs: ProviderDef<P>[]) {
  const [{ def, provider }, setChoice] = useState(() => pickProvider(defs[0]!));
  const select = (key: string) => {
    const next = defs.find((d) => d.key === key);
    if (next && next !== def) setChoice(pickProvider(next));
  };
  return { def, provider, select };
}

/**
 * Picker entries for the provider classes in one of the library's provider objects (ANIME and
 * MOVIES also hold the factories). Those in `emoji` come first, in its order, which makes the first
 * one the tab's default; the rest follow with 📦.
 */
function providerDefs<L extends object, P>(
  library: L,
  isProvider: (value: unknown) => value is ProviderClass<P>,
  emoji: Partial<Record<ClassKey<L>, string>>
): ProviderDef<P>[] {
  const order: string[] = Object.keys(emoji);
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? order.length : index;
  };
  return Object.entries(library)
    .filter((entry): entry is [string, ProviderClass<P>] => isProvider(entry[1]))
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, Provider]) => ({
      key,
      label: key,
      emoji: (emoji as Record<string, string | undefined>)[key] ?? '📦',
      make: () => new Provider(),
    }));
}

const subclassOf =
  <P>(Base: abstract new () => object) =>
  (value: unknown): value is ProviderClass<P> =>
    typeof value === 'function' && value.prototype instanceof Base;

export const ANIME_PROVIDERS = providerDefs(ANIME, subclassOf<IAnimeProvider>(AnimeParser), {
  AniNeko: '🐱',
  AniKoto: '🌸',
  Zoro: '⚔️',
  AnimePahe: '🦋',
  ReAnime: '🔁',
});

export const MOVIE_PROVIDERS = providerDefs(MOVIES, subclassOf<IMovieProvider>(MovieParser), {
  VegaMovies: '🎬',
  HiMovies: '🍿',
  NetflixMirror: '🎭',
  PrimeMirror: '📦',
  DisneyMirror: '🏰',
});

/**
 * Whether the provider lists sub and dub as separate entries (a provider factory's
 * `isDubAvailableSeparately`), so the app offers a SUB / DUB toggle. META.Anilist passes the choice
 * on to the provider it wraps, so that provider decides.
 */
export const isDubSeparate = (provider: object): boolean =>
  provider instanceof META.Anilist
    ? isDubSeparate(provider.provider)
    : 'isDubAvailableSeparately' in provider && provider.isDubAvailableSeparately === true;

/** The calls the Manga tab makes: the shape every manga provider shares (docs/guides/manga.md). */
export type MangaProvider = {
  search(query: string, page?: number): Promise<ISearch<IMangaResult>>;
  fetchMangaInfo(mangaId: string): Promise<IMangaInfo>;
  fetchChapterPages(chapterId: string): Promise<IMangaChapterPage[]>;
};

/**
 * MANGA holds only classes. They are typed by the shared shape rather than by their own class, so
 * one that drifts from the shape (say, a `fetchChapterPages` that wants a second argument) still
 * loads and the tab's contract panel shows what it breaks, instead of the app failing to compile.
 */
const isMangaProvider = (value: unknown): value is ProviderClass<MangaProvider> => typeof value === 'function';

export const MANGA_PROVIDERS = providerDefs(MANGA, isMangaProvider, {
  MangaDex: '📚',
  MangaHere: '📖',
  MangaKakalot: '🐉',
  MangaPill: '💊',
  AsuraScans: '🗡️',
  FlameScans: '🔥',
});
