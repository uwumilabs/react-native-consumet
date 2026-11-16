import BaseParser from './base-parser';
import type { TvType, ISource, IEpisodeServer, IMovieInfo, IMovieProvider, IMovieResult, ISearch } from './types';

abstract class MovieParser extends BaseParser implements IMovieProvider {
  /** What the site has: movies, TV series, or both */
  abstract supportedTypes: Set<TvType>;

  abstract override search(query: string, ...args: any[]): Promise<ISearch<IMovieResult>>;

  /** The movie or series with its episodes */
  abstract fetchMediaInfo(mediaId: string, ...args: any[]): Promise<IMovieInfo>;

  abstract fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>;

  abstract fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>;
}

export default MovieParser;
