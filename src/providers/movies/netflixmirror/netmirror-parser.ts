import { MovieParser, type ProviderContext } from '../../../models';
import { createProviderContext } from '../../../utils';
import type { NetflixMirrorProviderInstance } from './create-netflixmirror';

type NetMirrorFactory = (ctx: ProviderContext, customBaseURL?: string) => NetflixMirrorProviderInstance;

// Backward compatibility wrapper shared by the NetflixMirror, PrimeMirror and DisneyMirror classes
class NetMirrorParser extends MovieParser {
  private instance: NetflixMirrorProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  constructor(factory: NetMirrorFactory, customBaseURL?: string) {
    super();

    this.instance = factory(createProviderContext(), customBaseURL);
    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.supportedTypes = this.instance.supportedTypes;
    this.isNSFW = this.instance.isNSFW;
    this.isWorking = this.instance.isWorking ?? true;

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

export default NetMirrorParser;
