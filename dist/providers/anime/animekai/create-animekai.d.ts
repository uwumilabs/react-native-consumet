import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type SubOrDub, type ProviderContext } from '../../../models';
declare function createAnimeKai(ctx: ProviderContext, customBaseURL?: string): {
    name: string;
    baseUrl: string;
    logo: string;
    classPath: string;
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchLatestCompleted: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyAdded: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyUpdated: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchNewReleases: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchMovie: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchTV: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchOVA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchONA: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSpecial: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchGenres: () => Promise<string[]>;
    genreSearch: (genre: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchSchedule: (date?: string) => Promise<ISearch<IAnimeResult>>;
    fetchSpotlight: () => Promise<ISearch<IAnimeResult>>;
    fetchSearchSuggestions: (query: string) => Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo: (id: string) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrDub) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, subOrDub?: SubOrDub) => Promise<IEpisodeServer[]>;
};
export type AnimeKaiProviderInstance = ReturnType<typeof createAnimeKai>;
export default createAnimeKai;
//# sourceMappingURL=create-animekai.d.ts.map