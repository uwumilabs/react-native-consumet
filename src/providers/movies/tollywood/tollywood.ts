import { MovieParser } from '../../../models';
import { createProviderContext } from '../../../utils';
import { createTollywood, type TollywoodProviderInstance } from './create-tollywood';

// Backward compatibility wrapper class
class Tollywood extends MovieParser {
  private instance: TollywoodProviderInstance;
  override logo: string;
  override name: string;
  override baseUrl: string;
  override classPath: string;
  override supportedTypes: Set<any>;
  override isNSFW: boolean;
  override isWorking: boolean;

  constructor(customBaseURL?: string) {
    super();

    // Use of context factory to create a complete context with all defaults
    const defaultContext = createProviderContext();

    this.instance = createTollywood(defaultContext, customBaseURL);

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
    this.fetchTeluguFeatured = this.instance.fetchTeluguFeatured;
    this.fetchTeluguByYear = this.instance.fetchTeluguByYear;
    this.fetchLatestMovies = this.instance.fetchLatestMovies;
  }

  /**
   * Search for Telugu/Tollywood movies
   */
  search!: TollywoodProviderInstance['search'];

  /**
   * Fetch media info for a movie
   */
  fetchMediaInfo!: TollywoodProviderInstance['fetchMediaInfo'];

  /**
   * Fetch episode sources (actual video URLs)
   */
  fetchEpisodeSources!: TollywoodProviderInstance['fetchEpisodeSources'];

  /**
   * Fetch episode servers (streaming sources)
   */
  fetchEpisodeServers!: TollywoodProviderInstance['fetchEpisodeServers'];

  /**
   * Fetch Telugu featured movies
   */
  fetchTeluguFeatured!: TollywoodProviderInstance['fetchTeluguFeatured'];

  /**
   * Fetch Telugu movies by year
   */
  fetchTeluguByYear!: TollywoodProviderInstance['fetchTeluguByYear'];

  /**
   * Fetch latest Telugu movies from homepage
   */
  fetchLatestMovies!: TollywoodProviderInstance['fetchLatestMovies'];
}

export default Tollywood;
