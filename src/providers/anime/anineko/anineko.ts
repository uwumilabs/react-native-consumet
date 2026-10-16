import { AnimeParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createAniNeko, type AniNekoProviderInstance } from './create-anineko';

export class AniNeko extends AnimeParser {
  private instance: AniNekoProviderInstance;
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
  /** The older form, without a context. */
  constructor(customBaseURL?: string);
  constructor(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string) {
    super();
    const [ctx, baseURL] = providerArgs(ctxOrBaseURL, customBaseURL);
    this.instance = createAniNeko(ctx, baseURL);

    this.logo = this.instance.logo;
    this.capabilities = this.instance.capabilities;
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
    this.fetchRecentlyUpdated = this.instance.fetchRecentlyUpdated;
    this.fetchNewReleases = this.instance.fetchNewReleases;
    this.fetchRecentlyAdded = this.instance.fetchRecentlyAdded;
    this.genreSearch = this.instance.genreSearch;
  }

  search!: AniNekoProviderInstance['search'];
  fetchAnimeInfo!: AniNekoProviderInstance['fetchAnimeInfo'];
  fetchEpisodeServers!: AniNekoProviderInstance['fetchEpisodeServers'];
  fetchEpisodeSources!: AniNekoProviderInstance['fetchEpisodeSources'];
  fetchRecentlyUpdated!: AniNekoProviderInstance['fetchRecentlyUpdated'];
  fetchNewReleases!: AniNekoProviderInstance['fetchNewReleases'];
  fetchRecentlyAdded!: AniNekoProviderInstance['fetchRecentlyAdded'];
  genreSearch!: AniNekoProviderInstance['genreSearch'];
}
