import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createReanime, { type ReAnimeProviderInstance } from './create-reanime';

export class ReAnime extends AnimeParser {
  private instance: ReAnimeProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override isNSFW: boolean;
  override isWorking: boolean;
  override isDubAvailableSeparately: boolean;

  constructor(customBaseURL?: string, cookie?: string) {
    super();

    const defaultContext = createProviderContext();
    this.instance = createReanime(defaultContext, customBaseURL);

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

export default ReAnime;
