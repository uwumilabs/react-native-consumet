import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type SubOrDub, type ProviderContext } from '../../../models';
declare function createAnimeSuge(ctx: ProviderContext, customBaseURL?: string): {
    name: string;
    baseUrl: string;
    logo: string;
    classPath: string;
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo: (id: string) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, server?: StreamingServers, subOrDub?: SubOrDub) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string, subOrDub: SubOrDub) => Promise<IEpisodeServer[]>;
};
export type AnimeSugeProviderInstance = ReturnType<typeof createAnimeSuge>;
export default createAnimeSuge;
//# sourceMappingURL=create-animesuge.d.ts.map