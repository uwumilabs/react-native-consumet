import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type SubOrDub, type ProviderContext } from '../../../models';
declare function createAniKoto(ctx: ProviderContext, customBaseURL?: string): {
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchAdvancedSearch: (page?: number, type?: string, status?: string, rated?: string, score?: number, season?: string, language?: string, _startDate?: {
        year: number;
        month: number;
        day: number;
    }, _endDate?: {
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
    fetchStudio: (studioId: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSubbedAnime: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchDubbedAnime: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchMovie: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchTV: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchOVA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchONA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSpecial: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchGenres: () => Promise<string[]>;
    genreSearch: (genre: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSchedule: (date: string) => Promise<IAnimeResult[]>;
    fetchSpotlight: () => Promise<IAnimeResult[]>;
    fetchSearchSuggestions: (query: string) => Promise<IAnimeResult[]>;
    fetchAnimeInfo: (id: string) => Promise<IAnimeInfo>;
    fetchEpisodeServers: (episodeId: string, subOrDub?: SubOrDub) => Promise<IEpisodeServer[]>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrDub) => Promise<ISource>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type AniKotoProviderInstance = ReturnType<typeof createAniKoto>;
export default createAniKoto;
//# sourceMappingURL=create-anikoto.d.ts.map