import { MovieParser } from '../../../models';
import { createProviderContext } from '../../../utils';
import { createNetflixMirror, type NetflixMirrorProviderInstance } from './create-netflixmirror';

// Backward compatibility wrapper class
class NetflixMirror extends MovieParser {
  private instance: NetflixMirrorProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createNetflixMirror(defaultContext, customBaseURL);
    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.supportedTypes = this.instance.supportedTypes;
    this.isNSFW = this.instance.isNSFW;
    this.isWorking = this.instance.isWorking ?? true;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchMediaInfo = this.instance.fetchMediaInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    this.fetchHlsPlaylist = this.instance.fetchHlsPlaylist;
  }

  override search!: NetflixMirrorProviderInstance['search'];
  override fetchMediaInfo!: NetflixMirrorProviderInstance['fetchMediaInfo'];
  override fetchEpisodeSources!: NetflixMirrorProviderInstance['fetchEpisodeSources'];
  override fetchEpisodeServers!: NetflixMirrorProviderInstance['fetchEpisodeServers'];
  fetchHlsPlaylist!: NetflixMirrorProviderInstance['fetchHlsPlaylist'];
}

export default NetflixMirror;
