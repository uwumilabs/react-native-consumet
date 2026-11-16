"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMultiMovies = createMultiMovies;
const servers_1 = require("../../common/servers");
const site_paths_1 = require("../site-paths");
// The site's mirror list names hosts by their brand: StreamHG runs the StreamWish player and
// EarnVids the VidHide one, which is how extractSources tells them apart.
const SERVER_NAMES = {
  StreamHG: 'StreamWish',
  EarnVids: 'VidHide'
};
/**
 * MultiMovies (multimovies.center), a DooPlay (WordPress) site. Media and episode ids are page
 * paths such as `tvshows/jujutsu-kaisen` and `episodes/jujutsu-kaisen-1x1`.
 * @param customBaseURL site URL to use instead of the default
 */
function createMultiMovies(ctx, customBaseURL) {
  const {
    load,
    extractors,
    enums,
    axios,
    createCustomBaseUrl,
    PolyURL,
    USER_AGENT,
    CryptoJS
  } = ctx;
  const {
    StreamWish,
    VidHide
  } = extractors;
  const {
    StreamingServers: StreamingServersEnum,
    TvType: TvTypeEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://multimovies.center', customBaseURL);
  const config = {
    name: 'MultiMovies',
    languages: 'all',
    classPath: 'MOVIES.MultiMovies',
    logo: `${baseUrl}/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true
  };
  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  const getPage = async url => load((await axios.get(url)).data);
  const typeOf = id => id.startsWith('tvshows/') ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const $ = await getPage(`${baseUrl}/${page === 1 ? '' : `page/${page}/`}?s=${(0, site_paths_1.querySlug)(query, '+')}`);
    const results = await Promise.all($('.search-page .result-item article').toArray().map(async el => {
      const card = $(el);
      const href = card.find('.thumbnail a').attr('href') ?? '';
      const id = (0, site_paths_1.pageId)(href, baseUrl);
      // Search results don't show a series' season count, so count its episodes' seasons.
      const {
        episodes = []
      } = await fetchMediaInfo(id);
      return {
        id,
        title: card.find('.details .title a').text().trim(),
        url: href,
        image: card.find('.thumbnail img').attr('src') ?? '',
        rating: parseFloat(card.find('.meta .rating').text().replace('IMDb ', '')) || 0,
        releaseDate: card.find('.meta .year').text().trim(),
        seasons: new Set(episodes.map(episode => episode.season).filter(season => season != null)).size,
        description: card.find('.contenido p').text().trim(),
        type: typeOf(id)
      };
    }));
    return {
      currentPage: page,
      hasNextPage: $('div.pagination').find('#nextpagination').length > 0,
      results
    };
  };
  /** @param mediaId media id or page URL */
  const fetchMediaInfo = async mediaId => {
    const url = (0, site_paths_1.pageUrl)(mediaId, baseUrl);
    const id = (0, site_paths_1.pageId)(url, baseUrl);
    const $ = await getPage(url);
    const trailer = $('div#trailer .embed iframe');
    const trailerUrl = trailer.attr('data-litespeed-src') ?? trailer.attr('src');
    const info = {
      id,
      title: $('.sheader > .data > h1').text(),
      url,
      cover: $('div#info .galeria').first().find('.g-item a').attr('href')?.trim() ?? '',
      image: $('.sheader > .poster > img').attr('src') ?? $('.sheader > .poster > img').attr('data-src'),
      description: $('div#info div[itemprop="description"] p').text(),
      type: typeOf(id),
      releaseDate: $('.sheader > .data > .extra > span.date').text().trim(),
      trailer: {
        id: trailerUrl?.split('embed/')[1]?.split('?')[0],
        url: trailerUrl
      },
      genres: $('.sgeneros a').map((_, el) => $(el).text().trim()).get(),
      characters: $('div#cast .persons .person').toArray().map(el => {
        const person = $(el);
        const image = person.find('.img > a > img');
        return {
          url: person.find('.img > a').attr('href'),
          image: image.attr('data-src') ?? image.attr('src'),
          name: person.find('.data > .name > a').text(),
          character: person.find('.data > .caracter').text()
        };
      }),
      country: $('.sheader > .data > .extra > span.country').text(),
      duration: $('.sheader > .data > .extra > span.runtime').text(),
      rating: parseFloat($('.starstruck-rating span.dt_rating_vgs[itemprop="ratingValue"]').text()),
      recommendations: $('div#single_relacionados  article').toArray().map(el => {
        const recommendationId = (0, site_paths_1.pageId)($(el).find('a').attr('href') ?? '', baseUrl);
        const image = $(el).find('a img');
        return {
          id: recommendationId,
          title: image.attr('alt'),
          image: image.attr('data-src') ?? image.attr('src'),
          type: typeOf(recommendationId)
        };
      })
    };
    if (info.type !== TvTypeEnum.TVSERIES) {
      info.episodes = [{
        id,
        title: info.title,
        url,
        image: info.cover || info.image
      }];
      return info;
    }
    info.episodes = [];
    $('#seasons .se-c').each((_, seasonEl) => {
      const season = parseInt($(seasonEl).find('.se-t').text().trim());
      $(seasonEl).find('.episodios li').each((__, el) => {
        const episode = $(el);
        const link = episode.find('.episodiotitle a');
        const image = episode.find('.imagen img');
        info.episodes.push({
          id: (0, site_paths_1.pageId)(link.attr('href') ?? '', baseUrl),
          season,
          // "1 - 3": season 1, episode 3
          number: parseInt(episode.find('.numerando').text().trim().split('-')[1]),
          title: link.text().trim(),
          url: link.attr('href')?.trim() ?? '',
          releaseDate: String(new Date(episode.find('.episodiotitle .date').text().trim()).getFullYear()),
          image: image.attr('data-src')?.trim() ?? image.attr('src')?.trim()
        });
      });
    });
    return info;
  };
  const extractSources = async (embed, server, fileId) => {
    const embedUrl = new PolyURL(embed);
    const headers = {
      Referer: embedUrl.origin
    };
    if (server.toLowerCase().startsWith(StreamingServersEnum.VidHide)) {
      return {
        headers,
        ...(await VidHide(ctx).extract(embedUrl)),
        download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : ''
      };
    }
    return {
      headers,
      ...(await StreamWish(ctx).extract(embedUrl, embedUrl.origin)),
      download: fileId ? `${embedUrl.href.replace('/e/', '/f/')}/${fileId}` : ''
    };
  };
  /**
   * Reads an episode or movie page's player: the site's own StreamWish player, or a gdmirror
   * player whose embed helper lists the file's mirror hosts. `fileId` is the player's file id,
   * which the hosts' download pages take.
   */
  const loadServers = async url => {
    const $ = await getPage(url);
    const option = $('#player-option-1');
    const [post, nume, type] = ['data-post', 'data-nume', 'data-type'].map(name => option.attr(name));
    if (!post || !nume || !type) throw new Error('Missing player configuration');
    const headers = {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    const {
      data: player
    } = await axios.post(`${baseUrl}/wp-admin/admin-ajax.php`, `action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}`, {
      headers
    });
    const embed = player?.embed_url?.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)?.[1] || player?.embed_url;
    if (!embed) throw new Error('No player found');
    const fileId = embed.split('/').pop() ?? '';
    // The site's own player and dhcplay are StreamWish players.
    if (/multimovies|dhcplay/.test(embed)) return {
      servers: [{
        name: 'StreamWish',
        url: embed
      }],
      fileId
    };
    if (!fileId) throw new Error('No player ID found');
    const {
      data: mirrors
    } = await axios.post('https://pro.gtxgamer.site/embedhelper.php', `sid=${encodeURIComponent(fileId)}`, {
      headers
    });
    if (!mirrors) throw new Error('No stream data found');
    const paths = JSON.parse(CryptoJS.enc.Base64.parse(mirrors.mresult).toString(CryptoJS.enc.Utf8));
    const servers = Object.keys(paths).filter(site => site in mirrors.siteUrls).map(site => ({
      name: SERVER_NAMES[mirrors.siteFriendlyNames[site]] ?? mirrors.siteFriendlyNames[site],
      url: mirrors.siteUrls[site] + paths[site]
    }));
    return {
      servers,
      fileId
    };
  };
  /**
   * @param episodeId episode id, or a server's embed URL from fetchEpisodeServers
   * @param server server to play (default `StreamWish`); VidHide servers are read with the VidHide
   * extractor, every other one with StreamWish
   */
  const fetchEpisodeSources = async function (episodeId, _mediaId) {
    let server = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : StreamingServersEnum.StreamWish;
    if (episodeId.startsWith('http')) return extractSources(episodeId, server);
    const {
      servers,
      fileId
    } = await loadServers((0, site_paths_1.pageUrl)(episodeId, baseUrl));
    const picked = (0, servers_1.pickServer)(servers, server);
    return extractSources(picked.url, picked.name, fileId);
  };
  /** @param episodeId episode id or page URL */
  const fetchEpisodeServers = async (episodeId, _mediaId) => (await loadServers((0, site_paths_1.pageUrl)(episodeId, baseUrl))).servers;
  const fetchArticles = async (url, page) => {
    const $ = await getPage(url);
    return {
      currentPage: page,
      hasNextPage: $('div.pagination').find('#nextpagination').length > 0,
      results: $('.items > article').toArray().map(el => {
        const card = $(el);
        const href = card.find('div.poster > a').attr('href');
        const id = (0, site_paths_1.pageId)(href ?? '', baseUrl);
        return {
          id,
          title: card.find('div.data > h3').text(),
          url: href,
          image: card.find('div.poster > img').attr('data-src') ?? '',
          type: typeOf(id),
          rating: card.find('div.poster > div.rating').text(),
          releaseDate: card.find('div.data > span').text()
        };
      })
    };
  };
  const fetchPopular = function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchArticles(`${baseUrl}/trending/page/${page}/`, page);
  };
  /** @param genre genre slug, e.g. `action` */
  const fetchByGenre = function (genre) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return fetchArticles(`${baseUrl}/genre/${genre}/page/${page}`, page);
  };
  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
    fetchPopular,
    fetchByGenre
  };
}
//# sourceMappingURL=create-multimovies.js.map