import { MetaError, type IAnimeEpisode, type ITitle } from '../../models';
import { metaHttp, ENRICHMENT_TIMEOUT_MS } from '../../utils/meta-http';
import { normalizeTitle } from '../../utils/utils';

/** An episode number from a number or numeric text; undefined for anything else. */
export const toEpisodeNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

/** One entry of a MAL filler list; the list has one per episode, in order. */
export type FillerEpisode = { 'number': string; 'filler-bool': boolean };

/**
 * The filler list of a MAL id. Filler flags are optional enrichment: a missing or unreachable list
 * is an empty one, so the info call still succeeds.
 */
export const fetchFillerEpisodes = async (malId: number | string): Promise<FillerEpisode[]> => {
  try {
    const { data } = await metaHttp.get(
      `https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${encodeURIComponent(malId)}.json`,
      { timeout: ENRICHMENT_TIMEOUT_MS }
    );
    return Array.isArray(data?.episodes) ? data.episodes : [];
  } catch {
    return [];
  }
};

/**
 * Sets `isFiller` from a filler list by the provider's episode number. Episodes the list doesn't
 * reach keep `isFiller` unset.
 */
export const applyFiller = (episode: IAnimeEpisode, fillers: FillerEpisode[]) => {
  const number = toEpisodeNumber(episode.number);
  const filler = number === undefined ? undefined : fillers[number - 1];
  if (filler) episode.isFiller = Boolean(filler['filler-bool']);
};

/** Runs a call on the wrapped provider, reporting its failure as a provider MetaError. */
export const callProvider = async <T>(provider: { name: string }, what: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (err) {
    throw MetaError.from('provider', err, `Failed to fetch ${what} from ${provider.name}: ${err}`);
  }
};

/**
 * Dice's coefficient of the two strings' letter pairs, ignoring whitespace: 1 for equal strings,
 * 0 when they share no pair.
 */
const stringSimilarity = (first: string, second: string): number => {
  first = first.replace(/\s+/g, '');
  second = second.replace(/\s+/g, '');

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  const firstBigrams = new Map<string, number>();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2);
    firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2);
    const count = firstBigrams.get(bigram) ?? 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2);
};

/** The titles a search result goes by: its title (each name of an ITitle), `japaneseTitle` and `altTitles`. */
const titlesOf = (result: { title?: unknown; japaneseTitle?: unknown; altTitles?: unknown }): unknown[] => {
  const { title, japaneseTitle, altTitles } = result;
  const names =
    title && typeof title === 'object'
      ? [(title as ITitle).english, (title as ITitle).romaji, (title as ITitle).native, (title as ITitle).userPreferred]
      : [title];
  return [...names, japaneseTitle, ...(Array.isArray(altTitles) ? altTitles : [])];
};

/**
 * Anime provider results less similar than this (bestTitleMatch) to the wanted titles are not the
 * anime. META.Anilist and META.Myanimelist search the same providers, so they share it.
 */
export const MIN_ANIME_TITLE_SIMILARITY = 0.6;

/** A search result and how similar its closest title is to the wanted ones, from 0 to 1. */
export type TitleMatch<T> = { result: T; similarity: number };

/**
 * The search result whose titles are closest to any of `wanted`, when that similarity (Dice's
 * coefficient of the titles as `normalize` gives them, from 0 to 1) is at least `minSimilarity`.
 * `compare` orders the results that are close enough, best first: by default the most similar,
 * ties keeping the provider's order.
 */
export function bestTitleMatch<T extends { title?: unknown }>(
  wanted: readonly (string | null | undefined)[],
  results: readonly T[],
  minSimilarity: number,
  {
    compare = (a, b) => b.similarity - a.similarity,
    normalize = normalizeTitle,
  }: {
    compare?: (a: TitleMatch<T>, b: TitleMatch<T>) => number;
    normalize?: (title: string) => string;
  } = {}
): T | undefined {
  // Titles that normalize to nothing (only punctuation) would be equal to each other.
  const normalized = (titles: readonly unknown[]) =>
    titles.flatMap((title) => (typeof title === 'string' ? [normalize(title)] : [])).filter(Boolean);
  const targets = normalized(wanted);
  return results
    .map((result): TitleMatch<T> => {
      const similarities = normalized(titlesOf(result)).flatMap((title) =>
        targets.map((target) => stringSimilarity(target, title))
      );
      return { result, similarity: Math.max(0, ...similarities) };
    })
    .filter(({ similarity }) => similarity >= minSimilarity)
    .sort(compare)[0]?.result;
}
