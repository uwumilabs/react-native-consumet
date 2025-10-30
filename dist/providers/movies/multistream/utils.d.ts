import type { IEpisodeServer, ISource } from '../../../models';
export declare function getDummySourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getVidsrcSourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function get111MoviesSourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getVideasySourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getHexaSourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getMultiServers(id: string): Promise<IEpisodeServer[]>;
export declare function getMultiSources(id: string, server: string): Promise<ISource>;
//# sourceMappingURL=utils.d.ts.map