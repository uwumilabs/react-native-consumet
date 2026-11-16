import { load, type CheerioAPI } from 'cheerio';
import { metaHttp } from '../../utils/meta-http';

import {
  AnimeParser,
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IAnimeEpisode,
  SubOrDub,
  type IEpisodeServer,
  MediaFormat,
  type ProviderCapabilities,
  type IAnimeProvider,
  MetaError,
  type FuzzyDate,
  type ITitle,
} from '../../models';
import { MONTHS, searchTerm, substringAfter, substringBefore } from '../../utils/utils';
import { toMediaStatus } from '../common/media-status';
import { Zoro } from '../anime/zoro/zoro';
import { applyFiller, bestTitleMatch, callProvider, fetchFillerEpisodes } from './shared';

const KITSU_GRAPHQL_URL = 'https://kitsu.app/api/graphql';
/** Kitsu's anime for a title, with their episodes. Variables: `title`. */
const KITSU_TITLE_SEARCH_QUERY = `query ($title: String!) { searchAnimeByTitle(first: 5, title: $title) { nodes {id season startDate titles { localized } episodes(first: 2000){ nodes { number createdAt titles { canonical } description thumbnail { original { url } } } } } } }`;

/** MAL serves its pages to a browser user agent. */
const MAL_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
};

/** Provider results less similar than this to the MAL titles are not the anime; as in META.Anilist, which searches the same providers. */
const MIN_TITLE_SIMILARITY = 0.6;

/** Links MAL lists among the theme songs that aren't songs. */
const STREAMING_LINKS = ['Apple Music', 'Youtube Music', 'Amazon Music', 'Spotify'];

/**
 * Parse a MAL date: "Apr 5, 2009", "Apr 2009" or "2009", in any case. Months are 1-based, as on
 * AniList, and parts MAL doesn't give stay unset. Gives undefined for "?" and "Not available".
 */
const parseMalDate = (text: string | undefined): FuzzyDate | undefined => {
  const [, month, day, year] = /^(?:([a-z]{3})[a-z]*\.?\s+(?:(\d{1,2}),\s*)?)?(\d{4})$/i.exec(text?.trim() ?? '') ?? [];
  const monthIndex = month ? MONTHS.indexOf(month.toLowerCase()) : -1;
  if (!year || (month && monthIndex < 0)) return undefined;
  return { year: Number(year), month: month ? monthIndex + 1 : undefined, day: day ? Number(day) : undefined };
};

/** MAL's type column ("TV", "Movie", "TV Special") as a MediaFormat; undefined for types it has no member for. */
const toMediaFormat = (type: string): MediaFormat | undefined => {
  const format = type.trim().toUpperCase().replace(/\s+/g, '_');
  return (Object.values(MediaFormat) as string[]).includes(format) ? (format as MediaFormat) : undefined;
};

/** The opening or ending themes of an anime page: `.opnening` (sic) or `.ending`. */
const themeSongs = ($: CheerioAPI, list: 'opnening' | 'ending') =>
  $(`.theme-songs.js-theme-songs.${list}`)
    .find('tr')
    .get()
    .flatMap((row) => {
      const cell = $(row).children().eq(1);
      if (STREAMING_LINKS.includes(cell.children().first().text().trim())) return [];
      const index = $(row).find('.theme-song-index').text().trim();
      const band = $(row).find('.theme-song-artist').text().trim();
      const text = cell.text().trim();
      const name = index ? text.split(index)[1] : text;
      return [
        {
          name: (band ? name?.split(band)[0] : name)?.trim(),
          band: band.replace('by ', ''),
          episodes: $(row).find('.theme-song-episode').text().trim(),
        },
      ];
    });

/**
 * @deprecated Use `META.Anilist` instead. Myanimelist scrapes myanimelist.net pages, which change
 * without notice, and its episodes have no `uniqueId`. AniList has the same anime, gives the MAL id
 * as `malId`, and keys every episode with a stable `uniqueId`. Myanimelist will be removed in a
 * future major release.
 */
class Myanimelist extends AnimeParser {
  override readonly name = 'Myanimelist';
  protected override baseUrl = 'https://myanimelist.net/';
  protected override logo = 'https://en.wikipedia.org/wiki/MyAnimeList#/media/File:MyAnimeList.png';
  protected override classPath = 'META.Myanimelist';

  provider: AnimeParser | IAnimeProvider;

  /**
   * Maps MyAnimeList anime to an anime provider's episodes, filling missing episode titles, images
   * and descriptions from Kitsu.
   * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
   */
  constructor(provider?: AnimeParser | IAnimeProvider) {
    super();
    this.provider = provider || new Zoro();
  }

  override search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const { data } = await metaHttp.request({
      method: 'get',
      url: `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime&show=${50 * (page - 1)}`,
      headers: MAL_HEADERS,
    });

    const $ = load(data);
    const maxPage = parseInt($('.normal_header').find('span').children().last().text());
    const searchResults: ISearch<IAnimeResult> = { currentPage: page, hasNextPage: page < maxPage, results: [] };

    $('tr').each((i, item) => {
      const id = $(item).find('.hoverinfo_trigger').attr('href')?.split('anime/')[1]!.split('/')[0];
      const title = $(item).find('strong').text();
      const description = $(item).find('.pt4').text().replace('...read more.', '...');
      const type = $(item).children().eq(2).text().trim();
      const episodeCount = $(item).children().eq(3).text().trim();
      const score = (parseFloat($(item).children().eq(4).text()) * 10).toFixed(0);
      const imageTmp = $(item).children().first().find('img').attr('data-src');
      const imageUrl = `https://cdn.myanimelist.net/images/anime/${imageTmp?.split('anime/')[1]}`;

      if (title !== '') {
        searchResults.results.push({
          id: id ?? '',
          title: title,
          image: imageUrl,
          rating: parseInt(score),
          description: description,
          totalEpisodes: parseInt(episodeCount),
          type: toMediaFormat(type),
        });
      }
    });

    return searchResults;
  };

  /**
   * @param animeId MAL id
   * @param dub look for the dubbed episodes (default: `false`)
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   */
  fetchAnimeInfo = async (animeId: string, dub: boolean = false, fetchFiller: boolean = false): Promise<IAnimeInfo> => {
    try {
      const animeInfo = await this.fetchMalInfoById(animeId);

      const [episodes, fillerEpisodes] = await Promise.all([
        this.findProviderEpisodes(animeInfo.title as ITitle, animeInfo.season!, animeInfo.startDate?.year!, dub).catch(
          (err) => {
            throw MetaError.from('provider', err);
          }
        ),
        fetchFiller ? fetchFillerEpisodes(animeId) : [],
      ]);

      animeInfo.episodes = episodes.map((episode) => {
        if (!episode.image) episode.image = animeInfo.image;
        applyFiller(episode, fillerEpisodes);
        return episode;
      });

      return animeInfo;
    } catch (err) {
      throw MetaError.from('mal', err);
    }
  };

  override fetchEpisodeSources = (episodeId: string, ...args: any): Promise<ISource> =>
    callProvider(this.provider, 'episode sources', () => this.provider.fetchEpisodeSources(episodeId, ...args));

  fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> =>
    callProvider(this.provider, 'episode servers', () => this.provider.fetchEpisodeServers(episodeId));

  private findProviderEpisodes = async (
    title: ITitle,
    season: string,
    startYear: number,
    dub: boolean
  ): Promise<IAnimeEpisode[]> => {
    const term = searchTerm(title?.english || title?.romaji || title?.native || title?.userPreferred || '');
    const { results = [] } = ((await this.provider.search(term)) ?? {}) as Partial<ISearch<IAnimeResult>>;
    const match = bestTitleMatch([title?.english, title?.romaji, title?.native], results, MIN_TITLE_SIMILARITY);
    if (!match) return [];
    const anime = (await this.provider.fetchAnimeInfo(match.id)) as IAnimeInfo;

    // To avoid a new request, check that the anime found has the requested audio. A provider that
    // doesn't say (subOrDub, or hasSub/hasDub, unset) is taken to have it.
    const expectedType = dub ? SubOrDub.DUB : SubOrDub.SUB;
    const { subOrDub, hasSub, hasDub } = anime;
    const hasAudio = subOrDub
      ? subOrDub === SubOrDub.BOTH || subOrDub === expectedType
      : (dub ? hasDub : hasSub) !== false;
    if (!hasAudio) return [];

    // Providers with combined sub/dub entries end episode ids in `$both`; the caller picks one.
    const capabilities = (this.provider as { capabilities?: ProviderCapabilities }).capabilities;
    const episodes = (anime.episodes ?? []) as IAnimeEpisode[];
    if (capabilities?.subDub === 'combined' && anime.subOrDub === SubOrDub.BOTH) {
      for (const episode of episodes) episode.id = episode.id.replace('$both', dub ? '$dub' : '$sub');
    }

    const [first] = episodes;
    if (first?.image !== undefined && first?.title !== undefined && first?.description !== undefined) return episodes;
    return this.addKitsuDetails(episodes, term, season, startYear);
  };

  /** Fills the episodes' missing titles, images and descriptions from the Kitsu anime of the same season and year. */
  private addKitsuDetails = async (
    providerEpisodes: IAnimeEpisode[],
    title: string,
    season?: string,
    startYear?: number
  ): Promise<IAnimeEpisode[]> => {
    const { data } = await metaHttp.post(
      KITSU_GRAPHQL_URL,
      { query: KITSU_TITLE_SEARCH_QUERY, variables: { title } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const kitsuEpisodes = new Map<string, { title?: string; description?: string; thumbnail?: string }>();
    for (const node of data?.data?.searchAnimeByTitle?.nodes ?? []) {
      if (node.season !== season || node.startDate.trim().split('-')[0] !== startYear?.toString()) continue;
      for (const episode of node.episodes.nodes) {
        if (!episode) continue;
        kitsuEpisodes.set(episode.number.toString().replace(/"/g, ''), {
          title: episode.titles?.canonical?.toString().replace(/"/g, ''),
          description: episode.description?.en?.toString().replace(/"/g, '').replace('\\n', '\n'),
          thumbnail: episode.thumbnail?.original.url.toString().replace(/"/g, ''),
        });
      }
    }

    return providerEpisodes.map((ep, i) => {
      const kitsu = kitsuEpisodes.get(String(i + 1));
      return {
        id: ep.id,
        title: ep.title ?? kitsu?.title ?? null,
        image: ep.image ?? kitsu?.thumbnail ?? null,
        number: ep.number as number,
        description: ep.description ?? kitsu?.description ?? null,
        url: ep.url ?? null,
      } as IAnimeEpisode;
    });
  };

  /**
   * @param id MAL id
   * @returns the MAL info without episodes
   */
  fetchMalInfoById = async (id: string): Promise<IAnimeInfo> => {
    const { data } = await metaHttp.request({
      method: 'GET',
      url: `https://myanimelist.net/anime/${id}`,
      headers: MAL_HEADERS,
    });

    const $ = load(data);
    const imageElem = $('[itemprop="image"]').first();

    // Alternative titles are "Label: title" rows, and which rows exist differs per anime, so find
    // them by label rather than by position.
    const alternativeTitle = (label: string) => {
      const row = $('.spaceit_pad')
        .filter((_, elem) => $(elem).children('.dark_text').first().text().trim() === `${label}:`)
        .first();
      return substringAfter(row.text(), `${label}:`).trim() || undefined;
    };
    const english = alternativeTitle('English');

    const animeInfo: IAnimeInfo = {
      id,
      title: { english, romaji: $('.title-name').text(), native: alternativeTitle('Japanese'), userPreferred: english },
      genres: $('[itemprop="genre"]')
        .get()
        .map((elem) => $(elem).text()),
      image: imageElem.attr('src') || imageElem.attr('data-image') || imageElem.attr('data-src'),
      description: $('[itemprop="description"]').first().text(),
      synonyms:
        alternativeTitle('Synonyms')
          ?.split(',')
          .map((synonym) => synonym.trim())
          .filter(Boolean) ?? [],
      studios: [],
      popularity: parseInt($('.numbers.popularity').text().trim().replace('Popularity #', '').trim()),
      producers: $('a')
        .get()
        .filter(
          (link) =>
            $(link).attr('href')?.includes('producer') && $(link).parent().children().eq(0).text() === 'Producers:'
        )
        .map((link) => $(link).text()),
      openings: themeSongs($, 'opnening'),
      endings: themeSongs($, 'ending'),
    };

    const teaser = $('.video-promotion > a');
    const teaserURL = teaser.attr('href');
    if (teaserURL) {
      const style = teaser.attr('style');
      animeInfo.trailer = {
        id: substringAfter(teaserURL, 'embed/').split('?')[0]!,
        site: 'https://youtube.com/watch?v=',
        thumbnail: style ? substringBefore(substringAfter(style, "url('"), "'") : '',
      };
    }

    $('.spaceit_pad').each((_, elem) => {
      const text = $(elem).text().toLowerCase().trim();
      const key = text.split(':')[0];
      const value = substringAfter(text, `${key}:`).trim();
      switch (key) {
        case 'status':
          animeInfo.status = toMediaStatus(value);
          break;
        case 'episodes':
          animeInfo.totalEpisodes = parseInt(value);
          if (isNaN(animeInfo.totalEpisodes)) animeInfo.totalEpisodes = 0;
          break;
        case 'premiered':
          animeInfo.season = value.split(' ')[0]?.toUpperCase();
          break;
        case 'aired': {
          // "apr 5, 2009 to jul 4, 2010", "oct 20, 1999 to ?", or a single date for movies
          const [start, end] = value.split(/\s+to\s+/);
          const startDate = parseMalDate(start);
          const endDate = parseMalDate(end);
          if (startDate) animeInfo.startDate = startDate;
          if (endDate) animeInfo.endDate = endDate;
          break;
        }
        case 'score':
          animeInfo.rating = parseFloat(value);
          break;
        case 'studios':
          for (const studio of $(elem).find('a')) animeInfo.studios?.push($(studio).text());
          break;
        case 'rating':
          animeInfo.ageRating = value;
      }
    });

    return animeInfo;
  };
}

export default Myanimelist;
