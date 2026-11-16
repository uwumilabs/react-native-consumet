import type { AnyNode, CheerioAPI } from 'cheerio';
import {
  type IMovieInfo,
  type IMovieEpisode,
  type IEpisodeServer,
  type ISource,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';
import { pickServer, serverName } from '../../common/servers';
import { pageId, pageUrl, querySlug } from '../site-paths';

const CARDS = '.film_list-wrap > div.flw-item';
const PAGINATION = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';

/**
 * Reads a card's year-or-season label: movie cards show the year (`2021`), series cards their
 * latest season (`SS 2`), which is how many seasons the series has.
 */
const yearOrSeasons = (label: string): { releaseDate?: string; seasons?: number } => {
  const text = label.trim();
  if (text.includes('SS')) return { seasons: parseInt(text.split('SS')[1]!, 10) };
  return isNaN(parseInt(text, 10)) ? {} : { releaseDate: text };
};

/**
 * HiMovies (himovies.sx). Media ids are page paths such as `tv/watch-vincenzo-67955`.
 * @param customBaseURL site URL to use instead of the default
 */
export function createHiMovies(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL } = ctx;
  const { MegaCloud } = extractors;
  const { TvType: TvTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://himovies.sx', customBaseURL);

  const config: ProviderConfig = {
    name: 'HiMovies',
    languages: 'all',
    classPath: 'MOVIES.HiMovies',
    logo: 'https://himovies.sx/images/group_1/theme_1/favicon.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  const getPage = async (url: string): Promise<CheerioAPI> => load((await axios.get(url)).data);

  const parseCard = ($: CheerioAPI, el: AnyNode): IMovieResult => {
    const card = $(el);
    const id = pageId(card.find('div.film-poster > a').attr('href') ?? '', baseUrl);
    const link = card.find('div.film-detail .film-name > a');
    const details = card.find('div.film-detail > div.fd-infor');
    // Movies: year, duration. Series: "SS 2", "EPS 16".
    const label = details.find('span:nth-child(1)').text();
    const extent = details.find('span:nth-child(3)').text().trim();
    const type = details.find('span.float-right').text() === 'Movie' ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES;
    return {
      id,
      title: link.attr('title') ?? link.text().trim(),
      url: pageUrl(id, baseUrl),
      image: card.find('div.film-poster > img').attr('data-src'),
      type,
      ...yearOrSeasons(label),
      ...(type === TvTypeEnum.TVSERIES
        ? { latestEpisode: extent.replace('EPS', '').trim() || undefined }
        : { duration: extent || undefined }),
    };
  };

  const fetchCardPage = async (url: string, page: number): Promise<ISearch<IMovieResult>> => {
    const $ = await getPage(url);
    const pagination = $(PAGINATION);
    return {
      currentPage: page,
      // The last page's link is the active one
      hasNextPage: pagination.length > 0 && !pagination.children().last().hasClass('active'),
      results: $(CARDS)
        .toArray()
        .map((el) => parseCard($, el)),
    };
  };

  const parseInfoPage = ($: CheerioAPI, url: string): IMovieInfo => {
    const id = pageId(url, baseUrl);
    return {
      id,
      title: $('.heading-name > a:nth-child(1)').text(),
      url,
      // style="background-image: url(https://...);"
      cover: /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec($('div.cover_follow').attr('style') ?? '')?.[1],
      image: $('.film-poster > img:nth-child(1)').attr('src'),
      description: $('.description').text().trim(),
      type: id.startsWith('tv/') ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
      releaseDate: $('div.row-line:contains(Released:)').text().replace('Released:', '').trim(),
      genres: $('div.row-line:contains(Genre:) a')
        .map((_, el) => $(el).text().split('&'))
        .get()
        .map((v) => v.trim()),
      casts: $('.row-line:contains(Casts:) a')
        .map((_, el) => $(el).text())
        .get(),
      production: $('.row-line:contains(Production:) a').text().trim(),
      country: $('.row-line:contains(Country:) a').text().trim(),
      duration: $('.row-line:contains(Duration:)').text().replace('Duration:', '').replace(/\s+/g, ' ').trim(),
      rating: parseFloat($('.dp-i-stats > span.item:nth-child(3)').text().replace('IMDB:', '').trim()),
      recommendations: $('section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item')
        .toArray()
        .map((el) => parseCard($, el)),
    };
  };

  // A series card shows its latest season, not its year. Meta providers (TMDB) match search results
  // on the year, so take it from the title's page.
  const withReleaseYear = async (result: IMovieResult): Promise<IMovieResult> => {
    if (result.releaseDate) return result;
    try {
      const url = pageUrl(result.id, baseUrl);
      const year = new Date(parseInfoPage(await getPage(url), url).releaseDate ?? '').getFullYear();
      return isNaN(year) ? result : { ...result, releaseDate: String(year) };
    } catch {
      // A page that doesn't load leaves the result without a year rather than failing the search.
      return result;
    }
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const cards = await fetchCardPage(`${baseUrl}/search/${querySlug(query, '-')}?page=${page}`, page);
    return { ...cards, results: await Promise.all(cards.results.map(withReleaseYear)) };
  };

  const fetchSeriesEpisodes = async (uid: string): Promise<IMovieEpisode[]> => {
    const seasonList = await getPage(`${baseUrl}/ajax/season/list/${uid}`);
    const seasonIds = seasonList('.dropdown-menu > a')
      .map((_, el) => seasonList(el).attr('data-id'))
      .get();

    const episodes: IMovieEpisode[] = [];
    for (let i = 0; i < seasonIds.length; i++) {
      const $ = await getPage(`${baseUrl}/ajax/season/episodes/${seasonIds[i]}`);
      $('.nav > li').each((_, el) => {
        const link = $(el).find('a');
        const id = link.attr('id')!.split('-')[1]!;
        const title = link.attr('title')!;
        episodes.push({
          id,
          title,
          // "Eps 1: Pilot"
          number: parseInt(title.split(':')[0]!.slice(3).trim()),
          season: i + 1,
          url: `${baseUrl}/ajax/episode/servers/${id}`,
        });
      });
    }
    return episodes;
  };

  /** @param mediaId media id or page URL */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    const url = pageUrl(mediaId, baseUrl);
    const $ = await getPage(url);
    const info = parseInfoPage($, url);
    const uid = $('.detail_page-watch').attr('data-id')!;
    info.episodes =
      info.type === TvTypeEnum.TVSERIES
        ? await fetchSeriesEpisodes(uid)
        : [{ id: uid, title: info.title as string, url: `${baseUrl}/ajax/episode/list/${uid}` }];
    return info;
  };

  /**
   * @param episodeId episode id, or the episode's `url` from fetchMediaInfo
   * @param mediaId media id or page URL (found on the movie info object)
   */
  const fetchEpisodeServers = async (episodeId: string, mediaId: string): Promise<IEpisodeServer[]> => {
    // The site lists a movie's servers under the movie's id, a series episode's under the episode's.
    const list = pageId(mediaId, baseUrl).startsWith('movie/') ? 'list' : 'servers';
    const $ = await getPage(episodeId.startsWith('http') ? episodeId : `${baseUrl}/ajax/episode/${list}/${episodeId}`);
    return Promise.all(
      $('ul.nav > li')
        .toArray()
        .map(async (el) => {
          const link = $(el).find('a');
          const { data } = await axios.get(`${baseUrl}/ajax/episode/sources/${link.attr('data-id')}`);
          // Every server runs the MegaCloud player: "Server UpCloud" -> "megacloud-upcloud"
          return { name: serverName('megacloud', link.attr('title')!.replace(/^\s*server\s+/i, '')), url: data.link };
        })
    );
  };

  /**
   * @param episodeId episode id, or a server's embed URL from fetchEpisodeServers
   * @param mediaId media id or page URL
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when omitted
   */
  const fetchEpisodeSources = async (episodeId: string, mediaId: string, server?: string): Promise<ISource> => {
    const embedUrl = episodeId.startsWith('http')
      ? episodeId
      : pickServer(await fetchEpisodeServers(episodeId, mediaId), server).url;
    return MegaCloud(ctx).extract(new PolyURL(embedUrl), baseUrl);
  };

  const fetchHomeSection = async (cards: string): Promise<IMovieResult[]> => {
    const $ = await getPage(`${baseUrl}/home`);
    return $(cards)
      .toArray()
      .map((el) => parseCard($, el));
  };

  const fetchRecentMovies = () =>
    fetchHomeSection(
      'section.block_area:contains("Latest Movies") > div:nth-child(2) > div:nth-child(1) > div.flw-item'
    );

  const fetchRecentTvShows = () =>
    fetchHomeSection(
      'section.block_area:contains("Latest TV Shows") > div:nth-child(2) > div:nth-child(1) > div.flw-item'
    );

  const fetchTrendingMovies = () => fetchHomeSection('div#trending-movies div.film_list-wrap div.flw-item');

  const fetchTrendingTvShows = () => fetchHomeSection('div#trending-tv div.film_list-wrap div.flw-item');

  /** @param country country code, e.g. `KR` */
  const fetchByCountry = (country: string, page: number = 1) =>
    fetchCardPage(`${baseUrl}/country/${country}/?page=${page}`, page);

  /** @param genre genre slug, e.g. `drama` */
  const fetchByGenre = (genre: string, page: number = 1) =>
    fetchCardPage(`${baseUrl}/genre/${genre}?page=${page}`, page);

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
    fetchRecentMovies,
    fetchRecentTvShows,
    fetchTrendingMovies,
    fetchTrendingTvShows,
    fetchByCountry,
    fetchByGenre,
  };
}

export type HiMoviesProviderInstance = ReturnType<typeof createHiMovies>;
