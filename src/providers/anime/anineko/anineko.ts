import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createAniNeko, { type AniNekoProviderInstance } from './create-anineko';

export class AniNeko extends AnimeParser {
  private instance: AniNekoProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override isNSFW: boolean;
  override isWorking: boolean;
  override isDubAvailableSeparately: boolean;

  constructor(customBaseURL?: string) {
    super();
    const defaultContext = createProviderContext();
    this.instance = createAniNeko(defaultContext, customBaseURL);

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

  search!: AniNekoProviderInstance['search'];
  fetchAnimeInfo!: AniNekoProviderInstance['fetchAnimeInfo'];
  fetchEpisodeServers!: AniNekoProviderInstance['fetchEpisodeServers'];
  fetchEpisodeSources!: AniNekoProviderInstance['fetchEpisodeSources'];
  fetchRecentlyUpdated!: AniNekoProviderInstance['fetchRecentlyUpdated'];
  fetchNewReleases!: AniNekoProviderInstance['fetchNewReleases'];
  fetchRecentlyAdded!: AniNekoProviderInstance['fetchRecentlyAdded'];
  genreSearch!: AniNekoProviderInstance['genreSearch'];
}

export default AniNeko;
