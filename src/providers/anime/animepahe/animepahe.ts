import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createAnimePahe, { type AnimePaheProviderInstance } from './create-animepahe';

// Backward compatibility wrapper class
export class AnimePahe extends AnimeParser {
  private instance: AnimePaheProviderInstance;
  public logo: string;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createAnimePahe(defaultContext, customBaseURL);
    this.logo = this.instance.logo;

    // Bind all methods to preserve proper typing
    this.search = this.instance.search;
    this.fetchAnimeInfo = this.instance.fetchAnimeInfo;
    this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
    this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
  }

  // Getters for required AnimeParser properties
  get name() {
    return this.instance.name;
  }
  get baseUrl() {
    return this.instance.baseUrl;
  }
  set baseUrl(value: string) {
    this.instance.baseUrl = value;
  }
  get classPath() {
    return this.instance.classPath;
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

export default AnimePahe;

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
