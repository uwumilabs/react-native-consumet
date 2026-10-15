import { MovieParser, type ProviderContext } from '../../../models';
import type { NetflixMirrorProviderInstance } from './create-netflixmirror';
type NetMirrorFactory = (ctx: ProviderContext, customBaseURL?: string) => NetflixMirrorProviderInstance;
declare class NetMirrorParser extends MovieParser {
    private instance;
    logo: string;
    name: string;
    baseUrl: string;
    classPath: string;
    supportedTypes: Set<any>;
    isNSFW: boolean;
    isWorking: boolean;
    constructor(factory: NetMirrorFactory, customBaseURL?: string);
    search: NetflixMirrorProviderInstance['search'];
    fetchMediaInfo: NetflixMirrorProviderInstance['fetchMediaInfo'];
    fetchEpisodeSources: NetflixMirrorProviderInstance['fetchEpisodeSources'];
    fetchEpisodeServers: NetflixMirrorProviderInstance['fetchEpisodeServers'];
    fetchHlsPlaylist: NetflixMirrorProviderInstance['fetchHlsPlaylist'];
}
export default NetMirrorParser;
//# sourceMappingURL=netmirror-parser.d.ts.map