"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const meta_http_1 = require("../../utils/meta-http");
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
const utils_1 = require("../../utils");
const zoro_1 = __importDefault(require("../anime/zoro/zoro"));
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/**
 * Parse a MAL date: "Apr 5, 2009", "Apr 2009" or "2009", in any case. Months are 1-based, as on
 * AniList, and parts MAL doesn't give stay unset. Gives undefined for "?" and "Not available".
 */
const parseMalDate = text => {
  const [, month, day, year] = /^(?:([a-z]{3})[a-z]*\.?\s+(?:(\d{1,2}),\s*)?)?(\d{4})$/i.exec(text?.trim() ?? '') ?? [];
  const monthIndex = month ? MONTHS.indexOf(month.toLowerCase()) : -1;
  if (!year || month && monthIndex < 0) return undefined;
  return {
    year: Number(year),
    month: month ? monthIndex + 1 : undefined,
    day: day ? Number(day) : undefined
  };
};
/**
 * @deprecated Use `META.Anilist` instead. Myanimelist scrapes myanimelist.net pages, which change
 * without notice, and its episodes have no `uniqueId`. AniList has the same anime, gives the MAL id
 * as `malId`, and keys every episode with a stable `uniqueId`. Myanimelist will be removed in a
 * future major release.
 */
class Myanimelist extends models_1.AnimeParser {
  name = 'Myanimelist';
  baseUrl = 'https://myanimelist.net/';
  logo = 'https://en.wikipedia.org/wiki/MyAnimeList#/media/File:MyAnimeList.png';
  classPath = 'META.Myanimelist';
  anilistGraphqlUrl = 'https://graphql.anilist.co';
  kitsuGraphqlUrl = 'https://kitsu.app/api/graphql';
  malSyncUrl = 'https://api.malsync.moe';
  provider;
  /**
   * This class maps myanimelist to kitsu with any other anime provider.
   * kitsu is used for episode images, titles and description.
   * @param provider anime provider (optional) default: Gogoanime
   */
  constructor(provider) {
    super();
    this.provider = provider || new zoro_1.default();
  }
  malStatusToMediaStatus(status) {
    if (status === 'currently airing') return models_1.MediaStatus.ONGOING;else if (status === 'finished airing') return models_1.MediaStatus.COMPLETED;else if (status === 'not yet aired') return models_1.MediaStatus.NOT_YET_AIRED;
    return models_1.MediaStatus.UNKNOWN;
  }
  async populateEpisodeList(episodes, url) {
    let count = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    try {
      const {
        data
      } = await meta_http_1.metaHttp.request({
        method: 'get',
        url: `${url}?p=${count}`,
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35'
        }
      });
      let hasEpisodes = false;
      const $ = (0, cheerio_1.load)(data);
      for (const elem of $('.video-list').toArray()) {
        const href = $(elem).attr('href');
        const image = $(elem).find('img').attr('data-src');
        const titleDOM = $(elem).find('.episode-title');
        const title = titleDOM?.text();
        titleDOM.remove();
        const numberDOM = $(elem).find('.title').text().split(' ');
        let number = 0;
        if (numberDOM.length > 1) {
          number = Number(numberDOM[1]);
        }
        if (href && href.indexOf('myanimelist.net/anime') > -1) {
          hasEpisodes = true;
          episodes.push({
            id: '',
            number,
            title,
            image
          });
        }
      }
      if (hasEpisodes) await this.populateEpisodeList(episodes, url, ++count);
    } catch {
      // Best effort: keep the episodes found on earlier pages.
    }
  }
  search = (() => async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const searchResults = {
      currentPage: page,
      results: []
    };
    const {
      data
    } = await meta_http_1.metaHttp.request({
      method: 'get',
      url: `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime&show=${50 * (page - 1)}`,
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35'
      }
    });
    const $ = (0, cheerio_1.load)(data);
    const pages = $('.normal_header').find('span').children();
    const maxPage = parseInt(pages.last().text());
    const hasNextPage = page < maxPage;
    searchResults.hasNextPage = hasNextPage;
    $('tr').each((i, item) => {
      const id = $(item).find('.hoverinfo_trigger').attr('href')?.split('anime/')[1].split('/')[0];
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
          type: type === 'TV' ? models_1.MediaFormat.TV : type === 'TV_SHORT' ? models_1.MediaFormat.TV_SHORT : type === 'MOVIE' ? models_1.MediaFormat.MOVIE : type === 'SPECIAL' ? models_1.MediaFormat.SPECIAL : type === 'OVA' ? models_1.MediaFormat.OVA : type === 'ONA' ? models_1.MediaFormat.ONA : type === 'MUSIC' ? models_1.MediaFormat.MUSIC : type === 'MANGA' ? models_1.MediaFormat.MANGA : type === 'NOVEL' ? models_1.MediaFormat.NOVEL : type === 'ONE_SHOT' ? models_1.MediaFormat.ONE_SHOT : undefined
        });
      }
    });
    return searchResults;
  })();
  /**
   *
   * @param animeId anime id
   * @param fetchFiller fetch filler episodes
   */
  fetchAnimeInfo = (() => {
    var _this = this;
    return async function (animeId) {
      let dub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      let fetchFiller = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      try {
        const animeInfo = await _this.fetchMalInfoById(animeId);
        const titleWithLanguages = animeInfo?.title;
        let fillerEpisodes;
        animeInfo.episodes = await _this.findAnimeSlug(titleWithLanguages?.english || titleWithLanguages?.romaji || titleWithLanguages?.native || titleWithLanguages?.userPreferred, animeInfo.season, animeInfo.startDate?.year, animeId, dub).catch(err => {
          throw models_1.MetaError.from('provider', err);
        });
        if (fetchFiller) {
          // Optional enrichment: a missing or unreachable filler list must not fail the info call.
          fillerEpisodes = await meta_http_1.metaHttp.get(`https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${animeId}.json`, {
            timeout: meta_http_1.ENRICHMENT_TIMEOUT_MS
          }).then(_ref => {
            let {
              data
            } = _ref;
            return Array.isArray(data?.episodes) ? data.episodes : [];
          }).catch(() => []);
        }
        animeInfo.episodes = animeInfo.episodes?.map(episode => {
          if (!episode.image) episode.image = animeInfo.image;
          if (fetchFiller && fillerEpisodes?.length > 0 && fillerEpisodes?.length >= animeInfo.episodes.length) {
            if (fillerEpisodes[episode.number - 1]) episode.isFiller = new Boolean(fillerEpisodes?.[episode.number - 1]['filler-bool']).valueOf();
          }
          return episode;
        });
        return animeInfo;
      } catch (err) {
        throw models_1.MetaError.from('mal', err);
      }
    };
  })();
  fetchEpisodeSources = (() => {
    var _this2 = this;
    return async function (episodeId) {
      try {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        return await _this2.provider.fetchEpisodeSources(episodeId, ...args);
      } catch (err) {
        throw models_1.MetaError.from('provider', err, `Failed to fetch episode sources from ${_this2.provider.name}: ${err}`);
      }
    };
  })();
  fetchEpisodeServers(episodeId) {
    return this.provider.fetchEpisodeServers(episodeId);
  }
  findAnimeRaw = async (slug, externalLinks) => {
    const findAnime = await this.provider.search(slug);
    if (findAnime.results.length === 0) return undefined;
    // Sort the retrieved info for more accurate results.
    findAnime.results.sort((a, b) => {
      const targetTitle = slug.toLowerCase();
      let firstTitle;
      let secondTitle;
      if (typeof a.title === 'string') firstTitle = a.title;else firstTitle = a.title.english ?? a.title.romaji ?? '';
      if (typeof b.title === 'string') secondTitle = b.title;else secondTitle = b.title.english ?? b.title.romaji ?? '';
      const firstRating = (0, utils_1.calculateStringSimilarity)(targetTitle, firstTitle.toLowerCase());
      const secondRating = (0, utils_1.calculateStringSimilarity)(targetTitle, secondTitle.toLowerCase());
      // Sort in descending order
      return secondRating - firstRating;
    });
    // TODO: use much better way than this
    return await this.provider.fetchAnimeInfo(findAnime.results[0].id);
  };
  findAnimeSlug = async (title, season, startDate, malId, dub, externalLinks) => {
    // console.log({ title });
    const slug = title?.replace(/[^0-9a-zA-Z]+/g, ' ');
    let possibleAnime;
    possibleAnime = await this.findAnimeRaw(slug, externalLinks);
    if (!possibleAnime) return [];
    // To avoid a new request, check that the anime found has the requested audio. A provider that
    // doesn't say (subOrDub, or hasSub/hasDub, unset) is taken to have it.
    const expectedType = dub ? models_1.SubOrDub.DUB : models_1.SubOrDub.SUB;
    const {
      subOrDub,
      hasSub,
      hasDub
    } = possibleAnime;
    const hasAudio = subOrDub ? subOrDub === models_1.SubOrDub.BOTH || subOrDub === expectedType : (dub ? hasDub : hasSub) !== false;
    if (!hasAudio) return [];
    const capabilities = this.provider.capabilities;
    const combinedSubDub = capabilities ? capabilities.subDub === 'combined' : this.provider instanceof zoro_1.default;
    if (combinedSubDub) {
      // Set the correct episode sub/dub request type
      possibleAnime.episodes?.forEach((_, index) => {
        if (possibleAnime.subOrDub === models_1.SubOrDub.BOTH) {
          possibleAnime.episodes[index].id = possibleAnime.episodes[index].id.replace(`$both`, dub ? '$dub' : '$sub');
        }
      });
    }
    const possibleProviderEpisodes = possibleAnime.episodes ?? [];
    if (typeof possibleProviderEpisodes[0]?.image !== 'undefined' && typeof possibleProviderEpisodes[0]?.title !== 'undefined' && typeof possibleProviderEpisodes[0]?.description !== 'undefined') return possibleProviderEpisodes;
    const options = {
      headers: {
        'Content-Type': 'application/json'
      },
      query: (0, utils_1.kitsuSearchQuery)(slug)
    };
    const newEpisodeList = await this.findKitsuAnime(possibleProviderEpisodes, options, season, startDate);
    return newEpisodeList;
  };
  findKitsuAnime = async (possibleProviderEpisodes, options, season, startDate) => {
    const kitsuEpisodes = await meta_http_1.metaHttp.post(this.kitsuGraphqlUrl, options);
    const episodesList = new Map();
    if (kitsuEpisodes?.data.data) {
      const {
        nodes
      } = kitsuEpisodes.data.data.searchAnimeByTitle;
      if (nodes) {
        nodes.forEach(node => {
          if (node.season === season && node.startDate.trim().split('-')[0] === startDate?.toString()) {
            const episodes = node.episodes.nodes;
            for (const episode of episodes) {
              const i = episode?.number.toString().replace(/"/g, '');
              let name;
              let description;
              let thumbnail;
              if (episode?.description?.en) description = episode?.description.en.toString().replace(/"/g, '').replace('\\n', '\n');
              if (episode?.thumbnail) thumbnail = episode?.thumbnail.original.url.toString().replace(/"/g, '');
              if (episode) {
                if (episode.titles?.canonical) name = episode.titles.canonical.toString().replace(/"/g, '');
                episodesList.set(i, {
                  episodeNum: episode?.number.toString().replace(/"/g, ''),
                  title: name,
                  description,
                  thumbnail
                });
                continue;
              }
              episodesList.set(i, {
                episodeNum: undefined,
                title: undefined,
                description: undefined,
                thumbnail
              });
            }
          }
        });
      }
    }
    const newEpisodeList = [];
    if (possibleProviderEpisodes?.length !== 0) {
      possibleProviderEpisodes?.forEach((ep, i) => {
        const j = (i + 1).toString();
        newEpisodeList.push({
          id: ep.id,
          title: ep.title ?? episodesList.get(j)?.title ?? null,
          image: ep.image ?? episodesList.get(j)?.thumbnail ?? null,
          number: ep.number,
          description: ep.description ?? episodesList.get(j)?.description ?? null,
          url: ep.url ?? null
        });
      });
    }
    return newEpisodeList;
  };
  /**
   *
   * @param id anime id
   * @returns anime info without streamable episodes
   */
  fetchMalInfoById = async id => {
    const animeInfo = {
      id: id,
      title: ''
    };
    const {
      data
    } = await meta_http_1.metaHttp.request({
      method: 'GET',
      url: `https://myanimelist.net/anime/${id}`,
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35'
      }
    });
    const $ = (0, cheerio_1.load)(data);
    const episodes = [];
    const desc = $('[itemprop="description"]').first().text();
    const imageElem = $('[itemprop="image"]').first();
    const image = imageElem.attr('src') || imageElem.attr('data-image') || imageElem.attr('data-src');
    const genres = [];
    const genreDOM = $('[itemprop="genre"]').get();
    genreDOM.forEach(elem => genres.push($(elem).text()));
    animeInfo.genres = genres;
    animeInfo.image = image;
    animeInfo.description = desc;
    // Alternative titles are "Label: title" rows, and which rows exist differs per anime, so find
    // them by label rather than by position.
    const alternativeTitle = label => {
      const row = $('.spaceit_pad').filter((_, elem) => $(elem).children('.dark_text').first().text().trim() === `${label}:`).first();
      return (0, utils_1.substringAfter)(row.text(), `${label}:`).trim() || undefined;
    };
    const english = alternativeTitle('English');
    animeInfo.title = {
      english,
      romaji: $('.title-name').text(),
      native: alternativeTitle('Japanese'),
      userPreferred: english
    };
    animeInfo.synonyms = alternativeTitle('Synonyms')?.split(',').map(synonym => synonym.trim()).filter(Boolean) ?? [];
    animeInfo.studios = [];
    animeInfo.popularity = parseInt($('.numbers.popularity').text().trim().replace('Popularity #', '').trim());
    const producers = [];
    $('a').each(function (i, link) {
      if ($(link).attr('href')?.includes('producer') && $(link).parent().children().eq(0).text() === 'Producers:') {
        producers.push($(link).text());
      }
    });
    animeInfo.producers = producers;
    // animeInfo.episodes = episodes;
    const teaserDOM = $('.video-promotion > a');
    if (teaserDOM.length > 0) {
      const teaserURL = $(teaserDOM).attr('href');
      const style = $(teaserDOM).attr('style');
      if (teaserURL) {
        animeInfo.trailer = {
          id: (0, utils_1.substringAfter)(teaserURL, 'embed/').split('?')[0],
          site: 'https://youtube.com/watch?v=',
          thumbnail: style ? (0, utils_1.substringBefore)((0, utils_1.substringAfter)(style, "url('"), "'") : ''
        };
      }
    }
    const ops = $('.theme-songs.js-theme-songs.opnening').find('tr').get();
    const ignoreList = ['Apple Music', 'Youtube Music', 'Amazon Music', 'Spotify'];
    animeInfo.openings = ops.map(element => {
      //console.log($(element).text().trim());
      const name = $(element).children().eq(1).children().first().text().trim();
      if (!ignoreList.includes(name)) {
        if ($(element).find('.theme-song-index').length !== 0) {
          const index = $(element).find('.theme-song-index').text().trim();
          const band = $(element).find('.theme-song-artist').text().trim();
          const episodes = $(element).find('.theme-song-episode').text().trim();
          //console.log($(element).children().eq(1).text().trim().split(index)[1]);
          return {
            name: $(element).children().eq(1).text().trim().split(index)[1]?.split(band)[0]?.trim(),
            band: band.replace('by ', ''),
            episodes: episodes
          };
        } else {
          const band = $(element).find('.theme-song-artist').text().trim();
          const episodes = $(element).find('.theme-song-episode').text().trim();
          return {
            name: $(element).children().eq(1).text().trim()?.split(band)[0]?.trim(),
            band: band.replace('by ', ''),
            episodes: episodes
          };
        }
      }
    });
    animeInfo.openings = animeInfo.openings.filter(function (element) {
      return element !== undefined;
    });
    const eds = $('.theme-songs.js-theme-songs.ending').find('tr').get();
    animeInfo.endings = eds.map(element => {
      //console.log($(element).text().trim());
      const name = $(element).children().eq(1).children().first().text().trim();
      if (!ignoreList.includes(name)) {
        if ($(element).find('.theme-song-index').length !== 0) {
          const index = $(element).find('.theme-song-index').text().trim();
          const band = $(element).find('.theme-song-artist').text().trim();
          const episodes = $(element).find('.theme-song-episode').text().trim();
          //console.log($(element).children().eq(1).text().trim().split(index)[1]);
          return {
            name: $(element).children().eq(1).text().trim().split(index)[1]?.split(band)[0]?.trim(),
            band: band.replace('by ', ''),
            episodes: episodes
          };
        } else {
          const band = $(element).find('.theme-song-artist').text().trim();
          const episodes = $(element).find('.theme-song-episode').text().trim();
          return {
            name: $(element).children().eq(1).text().trim()?.split(band)[0]?.trim(),
            band: band.replace('by ', ''),
            episodes: episodes
          };
        }
      }
    });
    animeInfo.endings = animeInfo.endings.filter(function (element) {
      return element !== undefined;
    });
    const description = $('.spaceit_pad').get();
    description.forEach(elem => {
      const text = $(elem).text().toLowerCase().trim();
      const key = text.split(':')[0];
      const value = (0, utils_1.substringAfter)(text, `${key}:`).trim();
      switch (key) {
        case 'status':
          animeInfo.status = this.malStatusToMediaStatus(value);
          break;
        case 'episodes':
          animeInfo.totalEpisodes = parseInt(value);
          if (isNaN(animeInfo.totalEpisodes)) animeInfo.totalEpisodes = 0;
          break;
        case 'premiered':
          animeInfo.season = value.split(' ')[0]?.toUpperCase();
          break;
        case 'aired':
          {
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
    // Only works on certain animes, so it is unreliable
    // let videoLink = $('.mt4.ar a').attr('href');
    // if (videoLink) {
    //   await this.populateEpisodeList(episodes, videoLink);
    // }
    return animeInfo;
  };
}
exports.default = Myanimelist;
// (async () => {
//   const mal = new Myanimelist();
//   // const search = await mal.search('one piece');
//   const info = await mal.fetchAnimeInfo('21', true);
//   //console.log(info);
// })();
//# sourceMappingURL=mal.js.map