"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const cheerio_1 = require("cheerio");
const meta_http_1 = require("../../utils/meta-http");
const models_1 = require("../../models");
const utils_1 = require("../../utils/utils");
const media_status_1 = require("../common/media-status");
const zoro_1 = require("../anime/zoro/zoro");
const shared_1 = require("./shared");
const KITSU_GRAPHQL_URL = 'https://kitsu.app/api/graphql';
/** Kitsu's anime for a title, with their episodes. Variables: `title`. */
const KITSU_TITLE_SEARCH_QUERY = `query ($title: String!) { searchAnimeByTitle(first: 5, title: $title) { nodes {id season startDate titles { localized } episodes(first: 2000){ nodes { number createdAt titles { canonical } description thumbnail { original { url } } } } } } }`;
/** MAL serves its pages to a browser user agent. */
const MAL_HEADERS = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35'
};
/** Links MAL lists among the theme songs that aren't songs. */
const STREAMING_LINKS = ['Apple Music', 'Youtube Music', 'Amazon Music', 'Spotify'];
/**
 * Parse a MAL date: "Apr 5, 2009", "Apr 2009" or "2009", in any case. Months are 1-based, as on
 * AniList, and parts MAL doesn't give stay unset. Gives undefined for "?" and "Not available".
 */
const parseMalDate = text => {
  const [, month, day, year] = /^(?:([a-z]{3})[a-z]*\.?\s+(?:(\d{1,2}),\s*)?)?(\d{4})$/i.exec(text?.trim() ?? '') ?? [];
  const monthIndex = month ? utils_1.MONTHS.indexOf(month.toLowerCase()) : -1;
  if (!year || month && monthIndex < 0) return undefined;
  return {
    year: Number(year),
    month: month ? monthIndex + 1 : undefined,
    day: day ? Number(day) : undefined
  };
};
/** MAL's type column ("TV", "Movie", "TV Special") as a MediaFormat; undefined for types it has no member for. */
const toMediaFormat = type => {
  const format = type.trim().toUpperCase().replace(/\s+/g, '_');
  return Object.values(models_1.MediaFormat).includes(format) ? format : undefined;
};
/** The opening or ending themes of an anime page: `.opnening` (sic) or `.ending`. */
const themeSongs = ($, list) => $(`.theme-songs.js-theme-songs.${list}`).find('tr').get().flatMap(row => {
  const cell = $(row).children().eq(1);
  if (STREAMING_LINKS.includes(cell.children().first().text().trim())) return [];
  const index = $(row).find('.theme-song-index').text().trim();
  const band = $(row).find('.theme-song-artist').text().trim();
  const text = cell.text().trim();
  const name = index ? text.split(index)[1] : text;
  return [{
    name: (band ? name?.split(band)[0] : name)?.trim(),
    band: band.replace('by ', ''),
    episodes: $(row).find('.theme-song-episode').text().trim()
  }];
});
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
  provider;
  /**
   * Maps MyAnimeList anime to an anime provider's episodes, filling missing episode titles, images
   * and descriptions from Kitsu.
   * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
   */
  constructor(provider) {
    super();
    this.provider = provider || new zoro_1.Zoro();
  }
  search = (() => async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const {
      data
    } = await meta_http_1.metaHttp.request({
      method: 'get',
      url: `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime&show=${50 * (page - 1)}`,
      headers: MAL_HEADERS
    });
    const $ = (0, cheerio_1.load)(data);
    const maxPage = parseInt($('.normal_header').find('span').children().last().text());
    const searchResults = {
      currentPage: page,
      hasNextPage: page < maxPage,
      results: []
    };
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
          type: toMediaFormat(type)
        });
      }
    });
    return searchResults;
  })();
  /**
   * @param animeId MAL id
   * @param dub look for the dubbed episodes (default: `false`)
   * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
   */
  fetchAnimeInfo = (() => {
    var _this = this;
    return async function (animeId) {
      let dub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      let fetchFiller = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      try {
        const animeInfo = await _this.fetchMalInfoById(animeId);
        const title = animeInfo.title;
        const [episodes, fillerEpisodes] = await Promise.all([_this.findProviderEpisodes(title?.english || title?.romaji || title?.native || title?.userPreferred || '', animeInfo.season, animeInfo.startDate?.year, dub).catch(err => {
          throw models_1.MetaError.from('provider', err);
        }), fetchFiller ? (0, shared_1.fetchFillerEpisodes)(animeId) : []]);
        animeInfo.episodes = episodes.map(episode => {
          if (!episode.image) episode.image = animeInfo.image;
          (0, shared_1.applyFiller)(episode, fillerEpisodes);
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
    return function (episodeId) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      return (0, shared_1.callProvider)(_this2.provider, 'episode sources', () => _this2.provider.fetchEpisodeSources(episodeId, ...args));
    };
  })();
  fetchEpisodeServers = episodeId => (0, shared_1.callProvider)(this.provider, 'episode servers', () => this.provider.fetchEpisodeServers(episodeId));
  /** The provider's info for the search result whose title is closest to `term`. */
  findProviderAnime = async term => {
    const {
      results
    } = await this.provider.search(term);
    if (results.length === 0) return undefined;
    const wanted = term.toLowerCase();
    const titleOf = result => (typeof result.title === 'string' ? result.title : result.title.english ?? result.title.romaji ?? '').toLowerCase();
    const closest = [...results].sort((a, b) => (0, shared_1.stringSimilarity)(wanted, titleOf(b)) - (0, shared_1.stringSimilarity)(wanted, titleOf(a)))[0];
    return await this.provider.fetchAnimeInfo(closest.id);
  };
  findProviderEpisodes = async (title, season, startYear, dub) => {
    const term = (0, shared_1.searchTerm)(title);
    const anime = await this.findProviderAnime(term);
    if (!anime) return [];
    // To avoid a new request, check that the anime found has the requested audio. A provider that
    // doesn't say (subOrDub, or hasSub/hasDub, unset) is taken to have it.
    const expectedType = dub ? models_1.SubOrDub.DUB : models_1.SubOrDub.SUB;
    const {
      subOrDub,
      hasSub,
      hasDub
    } = anime;
    const hasAudio = subOrDub ? subOrDub === models_1.SubOrDub.BOTH || subOrDub === expectedType : (dub ? hasDub : hasSub) !== false;
    if (!hasAudio) return [];
    // Providers with combined sub/dub entries end episode ids in `$both`; the caller picks one.
    const capabilities = this.provider.capabilities;
    const episodes = anime.episodes ?? [];
    if (capabilities?.subDub === 'combined' && anime.subOrDub === models_1.SubOrDub.BOTH) {
      for (const episode of episodes) episode.id = episode.id.replace('$both', dub ? '$dub' : '$sub');
    }
    const [first] = episodes;
    if (first?.image !== undefined && first?.title !== undefined && first?.description !== undefined) return episodes;
    return this.addKitsuDetails(episodes, term, season, startYear);
  };
  /** Fills the episodes' missing titles, images and descriptions from the Kitsu anime of the same season and year. */
  addKitsuDetails = async (providerEpisodes, title, season, startYear) => {
    const {
      data
    } = await meta_http_1.metaHttp.post(KITSU_GRAPHQL_URL, {
      query: KITSU_TITLE_SEARCH_QUERY,
      variables: {
        title
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const kitsuEpisodes = new Map();
    for (const node of data?.data?.searchAnimeByTitle?.nodes ?? []) {
      if (node.season !== season || node.startDate.trim().split('-')[0] !== startYear?.toString()) continue;
      for (const episode of node.episodes.nodes) {
        if (!episode) continue;
        kitsuEpisodes.set(episode.number.toString().replace(/"/g, ''), {
          title: episode.titles?.canonical?.toString().replace(/"/g, ''),
          description: episode.description?.en?.toString().replace(/"/g, '').replace('\\n', '\n'),
          thumbnail: episode.thumbnail?.original.url.toString().replace(/"/g, '')
        });
      }
    }
    return providerEpisodes.map((ep, i) => {
      const kitsu = kitsuEpisodes.get(String(i + 1));
      return {
        id: ep.id,
        title: ep.title ?? kitsu?.title ?? null,
        image: ep.image ?? kitsu?.thumbnail ?? null,
        number: ep.number,
        description: ep.description ?? kitsu?.description ?? null,
        url: ep.url ?? null
      };
    });
  };
  /**
   * @param id MAL id
   * @returns the MAL info without episodes
   */
  fetchMalInfoById = async id => {
    const {
      data
    } = await meta_http_1.metaHttp.request({
      method: 'GET',
      url: `https://myanimelist.net/anime/${id}`,
      headers: MAL_HEADERS
    });
    const $ = (0, cheerio_1.load)(data);
    const imageElem = $('[itemprop="image"]').first();
    // Alternative titles are "Label: title" rows, and which rows exist differs per anime, so find
    // them by label rather than by position.
    const alternativeTitle = label => {
      const row = $('.spaceit_pad').filter((_, elem) => $(elem).children('.dark_text').first().text().trim() === `${label}:`).first();
      return (0, utils_1.substringAfter)(row.text(), `${label}:`).trim() || undefined;
    };
    const english = alternativeTitle('English');
    const animeInfo = {
      id,
      title: {
        english,
        romaji: $('.title-name').text(),
        native: alternativeTitle('Japanese'),
        userPreferred: english
      },
      genres: $('[itemprop="genre"]').get().map(elem => $(elem).text()),
      image: imageElem.attr('src') || imageElem.attr('data-image') || imageElem.attr('data-src'),
      description: $('[itemprop="description"]').first().text(),
      synonyms: alternativeTitle('Synonyms')?.split(',').map(synonym => synonym.trim()).filter(Boolean) ?? [],
      studios: [],
      popularity: parseInt($('.numbers.popularity').text().trim().replace('Popularity #', '').trim()),
      producers: $('a').get().filter(link => $(link).attr('href')?.includes('producer') && $(link).parent().children().eq(0).text() === 'Producers:').map(link => $(link).text()),
      openings: themeSongs($, 'opnening'),
      endings: themeSongs($, 'ending')
    };
    const teaser = $('.video-promotion > a');
    const teaserURL = teaser.attr('href');
    if (teaserURL) {
      const style = teaser.attr('style');
      animeInfo.trailer = {
        id: (0, utils_1.substringAfter)(teaserURL, 'embed/').split('?')[0],
        site: 'https://youtube.com/watch?v=',
        thumbnail: style ? (0, utils_1.substringBefore)((0, utils_1.substringAfter)(style, "url('"), "'") : ''
      };
    }
    $('.spaceit_pad').each((_, elem) => {
      const text = $(elem).text().toLowerCase().trim();
      const key = text.split(':')[0];
      const value = (0, utils_1.substringAfter)(text, `${key}:`).trim();
      switch (key) {
        case 'status':
          animeInfo.status = (0, media_status_1.toMediaStatus)(value, models_1.MediaStatus);
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
    return animeInfo;
  };
}
exports.default = Myanimelist;
//# sourceMappingURL=mal.js.map