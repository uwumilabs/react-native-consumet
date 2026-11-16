import { MetaError, type IAnimeEpisode } from '../../models';
import { metaHttp, ENRICHMENT_TIMEOUT_MS } from '../../utils/meta-http';

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

/** A title as a provider search term: every run of characters other than letters and digits becomes a space. */
export const searchTerm = (title: string): string => title.replace(/[^0-9a-zA-Z]+/g, ' ');

/**
 * Dice's coefficient of the two strings' letter pairs, ignoring whitespace: 1 for equal strings,
 * 0 when they share no pair.
 */
export const stringSimilarity = (first: string, second: string): number => {
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
