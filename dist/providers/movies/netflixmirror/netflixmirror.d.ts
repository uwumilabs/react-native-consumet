import { MovieParser } from '../../../models';
import { type NetflixMirrorProviderInstance } from './create-netflixmirror';
declare class NetflixMirror extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    constructor(customBaseURL?: string);
    search: NetflixMirrorProviderInstance['search'];
    fetchMediaInfo: NetflixMirrorProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: NetflixMirrorProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: NetflixMirrorProviderInstance['fetchEpisodeServers'];
    fetchHlsPlaylist: NetflixMirrorProviderInstance['fetchHlsPlaylist'];
}
export default NetflixMirror;
//# sourceMappingURL=netflixmirror.d.ts.map