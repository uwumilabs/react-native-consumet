import { type IAnimeEpisode } from '../../models';
/** An episode number from a number or numeric text; undefined for anything else. */
export declare const toEpisodeNumber: (value: unknown) => number | undefined;
/** One entry of a MAL filler list; the list has one per episode, in order. */
export type FillerEpisode = {
    'number': string;
    'filler-bool': boolean;
};
/**
 * The filler list of a MAL id. Filler flags are optional enrichment: a missing or unreachable list
 * is an empty one, so the info call still succeeds.
 */
export declare const fetchFillerEpisodes: (malId: number | string) => Promise<FillerEpisode[]>;
/**
 * Sets `isFiller` from a filler list by the provider's episode number. Episodes the list doesn't
 * reach keep `isFiller` unset.
 */
export declare const applyFiller: (episode: IAnimeEpisode, fillers: FillerEpisode[]) => void;
/** Runs a call on the wrapped provider, reporting its failure as a provider MetaError. */
export declare const callProvider: <T>(provider: {
    name: string;
}, what: string, call: () => Promise<T>) => Promise<T>;
/** A title as a provider search term: every run of characters other than letters and digits becomes a space. */
export declare const searchTerm: (title: string) => string;
/**
 * Dice's coefficient of the two strings' letter pairs, ignoring whitespace: 1 for equal strings,
 * 0 when they share no pair.
 */
export declare const stringSimilarity: (first: string, second: string) => number;
//# sourceMappingURL=shared.d.ts.map