import type { CheerioAPI } from 'cheerio';
import {
  type IMovieInfo,
  type IEpisodeServer,
  type ISource,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';
import { pickServer, serverName } from '../../common/servers';
import { pageId, pageUrl, querySlug } from '../site-paths';

// The site's mirror list names hosts by their brand: EarnVids runs the VidHide player, and the
// others (StreamHG among them) the StreamWish one.
const VIDHIDE_HOSTS = ['EarnVids'];

/**
 * MultiMovies (multimovies.center), a DooPlay (WordPress) site. Media and episode ids are page
 * paths such as `tvshows/jujutsu-kaisen` and `episodes/jujutsu-kaisen-1x1`.
 * @param customBaseURL site URL to use instead of the default
 */
export function createMultiMovies(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL, USER_AGENT, CryptoJS } = ctx;
  const { StreamWish, VidHide } = extractors;
  const { TvType: TvTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://multimovies.center', customBaseURL);

  const config: ProviderConfig = {
    name: 'MultiMovies',
    languages: 'all',
    classPath: 'MOVIES.MultiMovies',
    logo: `${baseUrl}/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  const getPage = async (url: string): Promise<CheerioAPI> => load((await axios.get(url)).data);

  const typeOf = (id: string) => (id.startsWith('tvshows/') ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE);

  /** How many seasons a series has: search results don't show it, so its page's episodes are counted. */
  const countSeasons = async (id: string): Promise<number | undefined> => {
    try {
      const { episodes = [] } = await fetchMediaInfo(id);
      return new Set(episodes.map((episode) => episode.season).filter((season) => season != null)).size;
    } catch {
      // A page that doesn't load leaves the result without a count rather than failing the search.
      return undefined;
    }
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const $ = await getPage(`${baseUrl}/${page === 1 ? '' : `page/${page}/`}?s=${querySlug(query, '+')}`);
    const results = await Promise.all(
      $('.search-page .result-item article')
        .toArray()
        .map(async (el): Promise<IMovieResult> => {
          const card = $(el);
          const href = card.find('.thumbnail a').attr('href') ?? '';
          const id = pageId(href, baseUrl);
          const type = typeOf(id);
          return {
            id,
            title: card.find('.details .title a').text().trim(),
            url: href,
            image: card.find('.thumbnail img').attr('src') ?? '',
            rating: parseFloat(card.find('.meta .rating').text().replace('IMDb ', '')) || 0,
            releaseDate: card.find('.meta .year').text().trim(),
            seasons: type === TvTypeEnum.TVSERIES ? await countSeasons(id) : undefined,
            description: card.find('.contenido p').text().trim(),
            type,
          };
        })
    );
    return { currentPage: page, hasNextPage: $('div.pagination').find('#nextpagination').length > 0, results };
  };

  /** @param mediaId media id or page URL */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    const url = pageUrl(mediaId, baseUrl);
    const id = pageId(url, baseUrl);
    const $ = await getPage(url);
    const trailer = $('div#trailer .embed iframe');
    const trailerUrl = trailer.attr('data-litespeed-src') ?? trailer.attr('src');

    const info: IMovieInfo = {
      id,
      title: $('.sheader > .data > h1').text(),
      url,
      cover: $('div#info .galeria').first().find('.g-item a').attr('href')?.trim() ?? '',
      image: $('.sheader > .poster > img').attr('src') ?? $('.sheader > .poster > img').attr('data-src'),
      description: $('div#info div[itemprop="description"] p').text(),
      type: typeOf(id),
      releaseDate: $('.sheader > .data > .extra > span.date').text().trim(),
      trailer: { id: trailerUrl?.split('embed/')[1]?.split('?')[0]!, url: trailerUrl },
      genres: $('.sgeneros a')
        .map((_, el) => $(el).text().trim())
        .get(),
      characters: $('div#cast .persons .person')
        .toArray()
        .map((el) => {
          const person = $(el);
          const image = person.find('.img > a > img');
          return {
            url: person.find('.img > a').attr('href'),
            image: image.attr('data-src') ?? image.attr('src'),
            name: person.find('.data > .name > a').text(),
            character: person.find('.data > .caracter').text(),
          };
        }) as IMovieInfo['characters'],
      country: $('.sheader > .data > .extra > span.country').text(),
      duration: $('.sheader > .data > .extra > span.runtime').text(),
      rating: parseFloat($('.starstruck-rating span.dt_rating_vgs[itemprop="ratingValue"]').text()),
      recommendations: $('div#single_relacionados  article')
        .toArray()
        .map((el) => {
          const recommendationId = pageId($(el).find('a').attr('href') ?? '', baseUrl);
          const image = $(el).find('a img');
          return {
            id: recommendationId,
            title: image.attr('alt')!,
            image: image.attr('data-src') ?? image.attr('src'),
            type: typeOf(recommendationId),
          };
        }),
    };

    if (info.type !== TvTypeEnum.TVSERIES) {
      info.episodes = [{ id, title: info.title as string, url, image: info.cover || info.image }];
      return info;
    }

    info.episodes = [];
    $('#seasons .se-c').each((_, seasonEl) => {
      const season = parseInt($(seasonEl).find('.se-t').text().trim());
      $(seasonEl)
        .find('.episodios li')
        .each((__, el) => {
          const episode = $(el);
          const link = episode.find('.episodiotitle a');
          const image = episode.find('.imagen img');
          info.episodes!.push({
            id: pageId(link.attr('href') ?? '', baseUrl),
            season,
            // "1 - 3": season 1, episode 3
            number: parseInt(episode.find('.numerando').text().trim().split('-')[1]!),
            title: link.text().trim(),
            url: link.attr('href')?.trim() ?? '',
            releaseDate: String(new Date(episode.find('.episodiotitle .date').text().trim()).getFullYear()),
            image: image.attr('data-src')?.trim() ?? image.attr('src')?.trim(),
          });
        });
    });
    return info;
  };

  /** The sources of a server's embed URL, read by the extractor its name starts with. */
  const extractSources = async (embed: string, server: string = '', fileId?: string): Promise<ISource> => {
    const embedUrl = new PolyURL(embed);
    const headers = { Referer: embedUrl.origin };
    if (server.toLowerCase().startsWith('vidhide')) {
      return {
        headers,
        ...(await VidHide(ctx).extract(embedUrl)),
        download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '',
      };
    }
    return {
      headers,
      ...(await StreamWish(ctx).extract(embedUrl, embedUrl.origin)),
      download: fileId ? `${embedUrl.href.replace('/e/', '/f/')}/${fileId}` : '',
    };
  };

  /**
   * Reads an episode or movie page's player: the site's own StreamWish player, or a gdmirror
   * player whose embed helper lists the file's mirror hosts. `fileId` is the player's file id,
   * which the hosts' download pages take.
   */
  const loadServers = async (url: string): Promise<{ servers: IEpisodeServer[]; fileId: string }> => {
    const $ = await getPage(url);
    const option = $('#player-option-1');
    const [post, nume, type] = ['data-post', 'data-nume', 'data-type'].map((name) => option.attr(name));
    if (!post || !nume || !type) throw new Error('Missing player configuration');

    const headers = { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' };
    const { data: player } = await axios.post(
      `${baseUrl}/wp-admin/admin-ajax.php`,
      `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`,
      { headers }
    );
    const embed: string | undefined =
      player?.embed_url?.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)?.[1] || player?.embed_url;
    if (!embed) throw new Error('No player found');
    const fileId = embed.split('/').pop() ?? '';

    // The site's own player and dhcplay are StreamWish players.
    const ownPlayer = /multimovies|dhcplay/.exec(embed)?.[0];
    if (ownPlayer) return { servers: [{ name: serverName('streamwish', ownPlayer), url: embed }], fileId };
    if (!fileId) throw new Error('No player ID found');

    const { data: mirrors } = await axios.post(
      'https://pro.gtxgamer.site/embedhelper.php',
      `sid=${encodeURIComponent(fileId)}`,
      { headers }
    );
    if (!mirrors) throw new Error('No stream data found');
    const paths: Record<string, string> = JSON.parse(
      CryptoJS.enc.Base64.parse(mirrors.mresult).toString(CryptoJS.enc.Utf8)
    );
    const servers = Object.keys(paths)
      .filter((site) => site in mirrors.siteUrls)
      .map((site) => {
        const host: string = mirrors.siteFriendlyNames[site];
        return {
          name: serverName(VIDHIDE_HOSTS.includes(host) ? 'vidhide' : 'streamwish', host),
          url: mirrors.siteUrls[site] + paths[site],
        };
      });
    return { servers, fileId };
  };

  /**
   * @param episodeId episode id, or a server's embed URL from fetchEpisodeServers
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when
   * omitted. For an embed URL, `vidhide` reads it with the VidHide extractor, anything else with StreamWish.
   */
  const fetchEpisodeSources = async (episodeId: string, _mediaId?: string, server?: string): Promise<ISource> => {
    if (episodeId.startsWith('http')) return extractSources(episodeId, server);
    const { servers, fileId } = await loadServers(pageUrl(episodeId, baseUrl));
    const picked = pickServer(servers, server);
    return extractSources(picked.url, picked.name, fileId);
  };

  /** @param episodeId episode id or page URL */
  const fetchEpisodeServers = async (episodeId: string, _mediaId?: string): Promise<IEpisodeServer[]> =>
    (await loadServers(pageUrl(episodeId, baseUrl))).servers;

  const fetchArticles = async (url: string, page: number): Promise<ISearch<IMovieResult>> => {
    const $ = await getPage(url);
    return {
      currentPage: page,
      hasNextPage: $('div.pagination').find('#nextpagination').length > 0,
      results: $('.items > article')
        .toArray()
        .map((el) => {
          const card = $(el);
          const href = card.find('div.poster > a').attr('href');
          const id = pageId(href ?? '', baseUrl);
          return {
            id,
            title: card.find('div.data > h3').text(),
            url: href,
            image: card.find('div.poster > img').attr('data-src') ?? '',
            type: typeOf(id),
            rating: card.find('div.poster > div.rating').text(),
            releaseDate: card.find('div.data > span').text(),
          };
        }),
    };
  };

  const fetchPopular = (page: number = 1) => fetchArticles(`${baseUrl}/trending/page/${page}/`, page);

  /** @param genre genre slug, e.g. `action` */
  const fetchByGenre = (genre: string, page: number = 1) =>
    fetchArticles(`${baseUrl}/genre/${genre}/page/${page}`, page);

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
    fetchPopular,
    fetchByGenre,
  };
}

export type MultiMoviesProviderInstance = ReturnType<typeof createMultiMovies>;
