import BaseParser from './base-parser';
import type { IAnimeInfo, ISource, IEpisodeServer } from './types';

abstract class AnimeParser extends BaseParser {
  /** `true` when the site lists sub and dub as separate entries */
  protected readonly isDubAvailableSeparately: boolean = false;

  /** The anime with its episodes */
  abstract fetchAnimeInfo(animeId: string, ...args: any): Promise<IAnimeInfo>;

  abstract fetchEpisodeSources(episodeId: string, ...args: any): Promise<ISource>;

  abstract fetchEpisodeServers(episodeId: string, ...args: any): Promise<IEpisodeServer[]>;
}

export default AnimeParser;
