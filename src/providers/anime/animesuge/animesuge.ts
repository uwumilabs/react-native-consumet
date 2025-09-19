import { AnimeParser } from '../../../models';
import { createProviderContext } from '../../../utils/create-provider-context';
import createAnimeSuge, { type AnimeSugeProviderInstance } from './create-animesuge';

// Backward compatibility wrapper class
export class AnimeSuge extends AnimeParser {
  private instance: AnimeSugeProviderInstance;
  public logo: string;

  constructor(customBaseURL?: string) {
    super();

    // Use the context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createAnimeSuge(defaultContext, customBaseURL);
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
   * @param page Page number (optional)
   */
  search!: AnimeSugeProviderInstance['search'];
  /**
   * @param id Anime id
   */
  fetchAnimeInfo!: AnimeSugeProviderInstance['fetchAnimeInfo'];
  /**
   *
   * @param episodeId Episode id
   * @param server server type (default `VidCloud`) (optional)
   * @param subOrDub sub or dub (default `SubOrDub.SUB`) (optional)
   */
  fetchEpisodeSources!: AnimeSugeProviderInstance['fetchEpisodeSources'];
  /**
   * Method not implemented in AnimeSuge provider.
   * @param episodeId Episode id
   */
  fetchEpisodeServers!: AnimeSugeProviderInstance['fetchEpisodeServers'];
}

export default AnimeSuge;

(async () => {
  // tsx ./src/providers/anime/animesuge/animesuge.ts
  const animesuge = new AnimeSuge();
  const anime = await animesuge.search('Dandadan');
  //   const info = await animesuge.fetchAnimeInfo('solo-leveling-season-2-arise-from-the-shadow-19413');
  //   // console.log(info.episodes);
  //   const sources = await animesuge.fetchEpisodeServers(
  //     'solo-leveling-season-2-arise-from-the-shadow-19413$episode$131394',
  //     // 'megacloud-hd-2',
  //     // undefined,
  //     SubOrDub.DUB
  //   );
  console.log(anime);
})();
