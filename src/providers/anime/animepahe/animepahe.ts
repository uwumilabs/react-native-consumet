import { AnimeParser, type ProviderContext } from '../../../models';
import { providerArgs } from '../../provider-args';
import { createAnimePahe, type AnimePaheProviderInstance } from './create-animepahe';

// Backward compatibility wrapper class
export class AnimePahe extends AnimeParser {
  private instance: AnimePaheProviderInstance;
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
    this.instance = createAnimePahe(ctx, baseURL);

    this.logo = this.instance.logo;
    this.capabilities = this.instance.capabilities;
    this.name = this.instance.name;
    this.baseUrl = this.instance.baseUrl;
    this.classPath = this.instance.classPath;
    this.isNSFW = this.instance.isNSFW ?? false;
    this.isWorking = this.instance.isWorking ?? true;
    this.isDubAvailableSeparately = this.instance.isDubAvailableSeparately ?? false;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
  }

  /**
   * @param query Search query
   */
  search!: AnimePaheProviderInstance['search'];
  /**
   * @param id id format id/session
   * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
   */
  fetchAnimeInfo!: AnimePaheProviderInstance['fetchAnimeInfo'];
  /**
   *
   * @param episodeId Episode id
   * @param server server type (default `Kwik`) (optional)
   * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
   */
  fetchEpisodeSources!: AnimePaheProviderInstance['fetchEpisodeSources'];
  /**
   * Method not implemented in AnimePahe provider.
   * @param episodeId Episode id
   */
  fetchEpisodeServers!: AnimePaheProviderInstance['fetchEpisodeServers'];
}

// (async () => {
//   const pahe = new AnimePahe();
//   const anime = await pahe.search('Dandadan');
//   const info = await pahe.fetchAnimeInfo(anime.results[0]!.id);
//   console.log(info.episodes);
//   const sources = await pahe.fetchEpisodeSources(
//     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394$dub',
//     // 'megacloud-hd-2',
//     undefined,
//     SubOrDub.DUB
//   );
//   // console.log(sources);
// })();
