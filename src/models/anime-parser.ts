import axios from "axios";
import { BaseParser, type IAnimeInfo, type ISource, type IEpisodeServer } from '.';

abstract class AnimeParser extends BaseParser {
  /**
   * if the provider has dub and it's avialable seperatly from sub set this to `true`
   */
  protected readonly isDubAvailableSeparately: boolean = false;
  /**
   * takes anime id
   *
   * returns anime info (including episodes)
   */
  abstract fetchAnimeInfo(animeId: string, ...args: any): Promise<IAnimeInfo>;

  /**
   * takes episode id
   *
   * returns episode sources (video links)
   */
  abstract fetchEpisodeSources(episodeId: string, ...args: any): Promise<ISource>;

  /**
   * takes episode id
   *
   * returns episode servers (video links) available
   */
  abstract fetchEpisodeServers(episodeId: string, ...args: any): Promise<IEpisodeServer[]>;
}

export default AnimeParser;
