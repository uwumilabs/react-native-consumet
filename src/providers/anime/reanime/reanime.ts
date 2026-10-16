import { AnimeParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createReanime, type ReAnimeProviderInstance } from './create-reanime';

export class ReAnime extends AnimeParser {
  private instance: ReAnimeProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override isNSFW: boolean;
  override isWorking: boolean;
  override isDubAvailableSeparately: boolean;

  /**
   * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
   * @param customBaseURL site URL to use instead of the default (optional)
   */
  constructor(ctx?: ProviderContext, customBaseURL?: string);
  /** The older form, without a context. `cookie` is ignored. */
  constructor(customBaseURL?: string, cookie?: string);
  constructor(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string) {
    super();
    const [ctx, baseURL] = providerArgs(ctxOrBaseURL, customBaseURL);
    this.instance = createReanime(ctx, baseURL);

    this.logo = this.instance.logo;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.isNSFW = this.instance.isNSFW ?? false;
    this.isWorking = this.instance.isWorking ?? true;
    this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;

    this.search = this.instance.search;
    this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
  }

  search!: ReAnimeProviderInstance['search'];
  fetchAnimeInfo!: ReAnimeProviderInstance['fetchAnimeInfo'];
  fetchEpisodeServers!: ReAnimeProviderInstance['fetchEpisodeServers'];
  fetchEpisodeSources!: ReAnimeProviderInstance['fetchEpisodeSources'];
}
