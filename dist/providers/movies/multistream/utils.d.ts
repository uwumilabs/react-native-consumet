import type { AxiosInstance } from 'axios';
import type { IEpisodeServer, ISource } from '../../../models';
export declare function getDummySourcesAndServers(id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getVidsrcSourcesAndServers(axios: AxiosInstance, id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function get111MoviesSourcesAndServers(axios: AxiosInstance, id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getVideasySourcesAndServers(axios: AxiosInstance, id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getHexaSourcesAndServers(axios: AxiosInstance, id: string): Promise<ISource & {
    servers: IEpisodeServer[];
}>;
export declare function getMultiServers(axios: AxiosInstance, id: string): Promise<IEpisodeServer[]>;
export declare function getMultiSources(axios: AxiosInstance, id: string, server: string): Promise<ISource>;
//# sourceMappingURL=utils.d.ts.map