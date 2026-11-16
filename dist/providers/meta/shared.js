"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringSimilarity = exports.searchTerm = exports.callProvider = exports.applyFiller = exports.fetchFillerEpisodes = exports.toEpisodeNumber = void 0;
const models_1 = require("../../models");
const meta_http_1 = require("../../utils/meta-http");
/** An episode number from a number or numeric text; undefined for anything else. */
const toEpisodeNumber = (value) => {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
exports.toEpisodeNumber = toEpisodeNumber;
/**
 * The filler list of a MAL id. Filler flags are optional enrichment: a missing or unreachable list
 * is an empty one, so the info call still succeeds.
 */
const fetchFillerEpisodes = async (malId) => {
    try {
        const { data } = await meta_http_1.metaHttp.get(`https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${encodeURIComponent(malId)}.json`, { timeout: meta_http_1.ENRICHMENT_TIMEOUT_MS });
        return Array.isArray(data?.episodes) ? data.episodes : [];
    }
    catch {
        return [];
    }
};
exports.fetchFillerEpisodes = fetchFillerEpisodes;
/**
 * Sets `isFiller` from a filler list by the provider's episode number. Episodes the list doesn't
 * reach keep `isFiller` unset.
 */
const applyFiller = (episode, fillers) => {
    const number = (0, exports.toEpisodeNumber)(episode.number);
    const filler = number === undefined ? undefined : fillers[number - 1];
    if (filler)
        episode.isFiller = Boolean(filler['filler-bool']);
};
exports.applyFiller = applyFiller;
/** Runs a call on the wrapped provider, reporting its failure as a provider MetaError. */
const callProvider = async (provider, what, call) => {
    try {
        return await call();
    }
    catch (err) {
        throw models_1.MetaError.from('provider', err, `Failed to fetch ${what} from ${provider.name}: ${err}`);
    }
};
exports.callProvider = callProvider;
/** A title as a provider search term: every run of characters other than letters and digits becomes a space. */
const searchTerm = (title) => title.replace(/[^0-9a-zA-Z]+/g, ' ');
exports.searchTerm = searchTerm;
/**
 * Dice's coefficient of the two strings' letter pairs, ignoring whitespace: 1 for equal strings,
 * 0 when they share no pair.
 */
const stringSimilarity = (first, second) => {
    first = first.replace(/\s+/g, '');
    second = second.replace(/\s+/g, '');
    if (first === second)
        return 1;
    if (first.length < 2 || second.length < 2)
        return 0;
    const firstBigrams = new Map();
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
exports.stringSimilarity = stringSimilarity;
//# sourceMappingURL=shared.js.map