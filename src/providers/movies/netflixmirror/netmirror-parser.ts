import { MovieParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import type { NetflixMirrorProviderInstance } from './create-netflixmirror';

type NetMirrorFactory = (ctx: ProviderContext, customBaseURL?: string) => NetflixMirrorProviderInstance;

// Backward compatibility wrapper shared by the NetflixMirror, PrimeMirror and DisneyMirror classes
export class NetMirrorParser extends MovieParser {
  private instance: NetflixMirrorProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  constructor(factory: NetMirrorFactory, ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string) {
    super();

    const [ctx, baseURL] = providerArgs(ctxOrBaseURL, customBaseURL);
    this.instance = factory(ctx, baseURL);
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
