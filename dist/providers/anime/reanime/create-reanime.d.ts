import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type SubOrDub, type ProviderContext, StreamingServers } from '../../../models';
declare function createReanime(ctx: ProviderContext, customBaseURL?: string): {
    search: (query: string, page?: number, limit?: number) => Promise<ISearch<IAnimeResult>>;
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
export type ReAnimeProviderInstance = ReturnType<typeof createReanime>;
export default createReanime;
//# sourceMappingURL=create-reanime.d.ts.map