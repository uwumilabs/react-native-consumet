import { type SubOrDub, type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type ProviderContext } from '../../../models';
export declare function createAnimePahe(ctx: ProviderContext, customBaseURL?: string): {
    name: string;
    baseUrl: string;
    logo: string;
    classPath: string;
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo: (id: string, episodePage?: number) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrDub) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, subOrDub: SubOrDub) => Promise<IEpisodeServer[]>;
};
export type AnimePaheProviderInstance = ReturnType<typeof createAnimePahe>;
export default createAnimePahe;
//# sourceMappingURL=create-animepahe.d.ts.map