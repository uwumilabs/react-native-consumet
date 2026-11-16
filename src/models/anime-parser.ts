import BaseParser from './base-parser';
import type { IAnimeInfo, IAnimeProvider, IAnimeResult, ISearch, ISource, IEpisodeServer } from './types';

abstract class AnimeParser extends BaseParser implements IAnimeProvider {
  /**
   * `true` when fetchEpisodeServers and fetchEpisodeSources take a `SubOrDub` argument that picks
   * the audio (sub by default), so an app can offer a sub/dub toggle. Sub and dub share the same
   * episode ids.
   */
  protected readonly isDubAvailableSeparately: boolean = false;

  abstract override search(query: string, ...args: any[]): Promise<ISearch<IAnimeResult>>;

  /** The anime with its episodes */
  abstract fetchAnimeInfo(animeId: string, ...args: any[]): Promise<IAnimeInfo>;

  abstract fetchEpisodeSources(episodeId: string, ...args: any[]): Promise<ISource>;

  abstract fetchEpisodeServers(episodeId: string, ...args: any[]): Promise<IEpisodeServer[]>;
}

export default AnimeParser;
