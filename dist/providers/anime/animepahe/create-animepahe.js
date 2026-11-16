"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAnimePahe = createAnimePahe;
const media_status_1 = require("../../common/media-status");
const helpers_1 = require("../helpers");
function createAnimePahe(ctx, customBaseURL) {
  const {
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL,
    NativeConsumet
  } = ctx;
  const {
    Kwik
  } = extractors;
  const {
    makeGetRequestWithWebView
  } = NativeConsumet;
  const {
    SubOrDub: SubOrDubEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://animepahe.pw', customBaseURL);
  const config = {
    name: 'AnimePahe',
    languages: 'en',
    classPath: 'ANIME.AnimePahe',
    logo: 'https://animepahe.pw/web-app-manifest-512x512.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  // The site sits behind a Cloudflare managed challenge, so every page and API call is loaded in
  // the hidden WebView, which waits past the challenge. No User-Agent is sent: the WebView keeps
  // its own, which the cf_clearance cookie it earns is bound to.
  let challenge;
  /**
   * Loads the site once so the WebView holds a clearance before the first API call. Searches
   * running at once share the one load; a failed load is tried again by the next search. A passed
   * load is not repeated when the clearance expires: each WebView request waits past a challenge
   * itself, so an expired clearance only makes that request slower.
   */
  const ensureChallengePassed = () => {
    if (!challenge) {
      challenge = makeGetRequestWithWebView(baseUrl, {}).then(() => undefined, err => {
        challenge = undefined;
        throw err;
      });
    }
    return challenge;
  };
  /**
   * `parse` of the page at `url`, loaded through the WebView. Two failures pass and are tried
   * again, up to three loads: Chromium's QUIC error (ERR_QUIC_PROTOCOL_ERROR), and while the
   * challenge runs, an API answer that is the challenge page rather than JSON (`parse` throws),
   * which is asked again after a moment.
   */
  const webViewGet = async (url, headers, parse) => {
    for (let attempt = 1;; attempt++) {
      let html;
      try {
        html = (await makeGetRequestWithWebView(url, headers)).html ?? '';
      } catch (err) {
        if (attempt < 3 && String(err?.message ?? err).includes('QUIC')) continue;
        throw err;
      }
      try {
        return parse(html);
      } catch (err) {
        if (attempt >= 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  };
  const webViewPage = async url => webViewGet(url, {
    Referer: baseUrl
  }, html => load(html));
  const webViewApi = async function (url) {
    let referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : baseUrl;
    return webViewGet(url, {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': referer
    }, html => (0, helpers_1.webViewJson)(html, url));
  };
  const mapEpisode = (session, item) => ({
    id: `${session}/${item.session}`,
    number: item.episode,
    title: item.title,
    image: item.snapshot,
    duration: item.duration,
    isSubbed: item.audio === 'jpn' || item.audio === 'eng',
    isDubbed: item.audio === 'eng',
    releaseDate: item.created_at,
    url: `${baseUrl}/play/${session}/${item.session}`
  });
  const fetchEpisodePage = async (session, page) => webViewApi(`${baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, `${baseUrl}/anime/${session}`);
  /** @param _page ignored: the site answers a search with one page of results */
  const search = async function (query) {
    let _page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    await ensureChallengePassed();
    const data = await webViewApi(`${baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
    return {
      results: data.data.map(item => ({
        id: item.session,
        title: item.title,
        image: item.poster,
        rating: item.score,
        releaseDate: item.year,
        type: item.type
      }))
    };
  };
  /**
   * @param id the anime's session id
   * @param episodePage the page of episodes to list; -1 (the default) lists them all. The number of
   * pages is the info's `episodePages`.
   */
  const fetchAnimeInfo = async function (id) {
    let episodePage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
    const $ = await webViewPage(`${baseUrl}/anime/${id}`);
    const animeInfo = {
      id,
      title: $('div.title-wrapper > h1 > span').first().text()
    };
    animeInfo.image = $('div.anime-poster a').attr('href');
    animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
    animeInfo.description = $('div.anime-summary').text().trim();
    animeInfo.genres = $('div.anime-genre ul li').map((_, el) => $(el).find('a').attr('title')).get();
    animeInfo.hasSub = true;
    animeInfo.status = (0, media_status_1.toMediaStatus)($('div.anime-info p:icontains("Status:") a').text(), ctx.enums.MediaStatus);
    animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase();
    animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")').text().split('to')[0].replace('Aired:', '').trim();
    animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
    animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));
    const relatedCard = el => {
      const anchor = $(el).find('.col-2 > a');
      const animeId = anchor.attr('href')?.split('/')[2];
      return {
        id: animeId,
        title: anchor.attr('title'),
        image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
        url: `${baseUrl}/anime/${animeId}`,
        releaseDate: $(el).find('div.col-9 > a').text().trim(),
        status: $(el).find('div.col-9 > strong').text().trim()
      };
    };
    animeInfo.recommendations = $('div.anime-recommendation .col-sm-6').toArray().map(relatedCard);
    animeInfo.relations = $('div.anime-relation .col-sm-6').toArray().map(el => ({
      ...relatedCard(el),
      relationType: $(el).find('h4 > span').text().trim()
    }));
    animeInfo.episodes = [];
    if (episodePage < 0) {
      const firstPage = await fetchEpisodePage(id, 1);
      animeInfo.episodePages = firstPage.last_page;
      animeInfo.episodes.push(...firstPage.data.map(item => mapEpisode(id, item)));
      for (let i = 2; i <= firstPage.last_page; i++) {
        animeInfo.episodes.push(...(await fetchEpisodePage(id, i)).data.map(item => mapEpisode(id, item)));
      }
    } else {
      animeInfo.episodes.push(...(await fetchEpisodePage(id, episodePage)).data.map(item => mapEpisode(id, item)));
    }
    return animeInfo;
  };
  /** The episode's Kwik players, one per fansub and resolution, with the button's label. */
  const fetchPlayers = async (episodeId, subOrDub) => {
    const $ = await webViewPage(`${baseUrl}/play/${episodeId}`);
    const players = $('div#resolutionMenu > button').toArray().map(el => ({
      name: (0, helpers_1.serverName)('kwik', `${$(el).attr('data-fansub')}-${$(el).attr('data-resolution')}`),
      url: $(el).attr('data-src'),
      label: $(el).text(),
      isDub: $(el).attr('data-audio') === 'eng'
    })).filter(player => subOrDub === SubOrDubEnum.DUB ? player.isDub : subOrDub === SubOrDubEnum.SUB ? !player.isDub : true);
    const downloads = $('div#pickDownload > a').toArray().map(el => ({
      url: $(el).attr('href'),
      quality: $(el).text()
    }));
    return {
      players,
      downloads
    };
  };
  /**
   * Every player's stream as one source each, labelled with its quality: the servers are the
   * qualities of one stream.
   * @param episodeId `<anime session>/<episode session>`
   * @param server a server name from fetchEpisodeServers, or the start of one, to keep only the
   * servers it names; all of them when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async function (episodeId, server) {
    let subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    const {
      players,
      downloads
    } = await fetchPlayers(episodeId, subOrDub);
    const wanted = server ? players.filter(player => player.name.toLowerCase().startsWith(server.toLowerCase())) : players;
    if (server && !wanted.length) {
      throw new Error(`Server '${server}' not found; available: ${players.map(p => p.name).join(', ')}`);
    }
    const iSource = {
      headers: {
        Referer: 'https://kwik.cx/'
      },
      sources: [],
      download: downloads
    };
    for (const player of wanted) {
      const res = await Kwik(ctx).extract(new PolyURL(player.url), `${baseUrl}/`);
      for (const source of res?.sources ?? []) {
        iSource.sources.push({
          ...source,
          quality: (player.label.match(/(\d{3,4})p/) || [])[0]
        });
      }
    }
    return iSource;
  };
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const {
      players
    } = await fetchPlayers(episodeId, subOrDub);
    return players.map(_ref => {
      let {
        name,
        url
      } = _ref;
      return {
        name,
        url
      };
    });
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
    },
    search,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers
  };
}
//# sourceMappingURL=create-animepahe.js.map