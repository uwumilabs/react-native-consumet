import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type SubOrSub, type WatchListType, type ProviderContext } from '../../../models';
export declare function createZoro(ctx: ProviderContext, customBaseURL?: string): {
    name: string;
    baseUrl: string;
    logo: string;
    classPath: string;
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchAdvancedSearch: (page?: number, type?: string, status?: string, rated?: string, score?: number, season?: string, language?: string, startDate?: {
        year: number;
        month: number;
        day: number;
    }, endDate?: {
        year: number;
        month: number;
        day: number;
    }, sort?: string, genres?: string[]) => Promise<ISearch<IAnimeResult>>;
    fetchTopAiring: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchMostPopular: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchMostFavorite: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchLatestCompleted: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyUpdated: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyAdded: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchTopUpcoming: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchStudio: (studio: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSubbedAnime: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchDubbedAnime: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchMovie: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchTV: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchOVA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchONA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSpecial: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchGenres: (page?: number) => Promise<ISearch<IAnimeResult>>;
    genreSearch: (genre: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSchedule: (date: string) => Promise<IAnimeResult[]>;
    fetchSpotlight: () => Promise<IAnimeResult[]>;
    fetchSearchSuggestions: (query: string) => Promise<IAnimeResult[]>;
    fetchContinueWatching: () => Promise<IAnimeResult[]>;
    fetchWatchList: (watchListType: WatchListType) => Promise<IAnimeResult[]>;
    fetchAnimeInfo: (id: string) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrSub) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string) => Promise<IEpisodeServer[]>;
};
export type ZoroProviderInstance = ReturnType<typeof createZoro>;
export default createZoro;
//# sourceMappingURL=create-zoro.d.ts.map