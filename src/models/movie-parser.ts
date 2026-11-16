import BaseParser from './base-parser';
import type { TvType, ISource, IEpisodeServer, IMovieInfo, IAnimeInfo } from './types';

abstract class MovieParser extends BaseParser {
  /** What the site has: movies, TV series, or both */
  abstract supportedTypes: Set<TvType>;

  /** The movie or series with its episodes */
  abstract fetchMediaInfo(mediaId: string, type?: string): Promise<IMovieInfo | IAnimeInfo>;

  abstract fetchEpisodeSources(episodeId: string, ...args: any): Promise<ISource>;

  abstract fetchEpisodeServers(episodeId: string, ...args: any): Promise<IEpisodeServer[]>;
}

export default MovieParser;
