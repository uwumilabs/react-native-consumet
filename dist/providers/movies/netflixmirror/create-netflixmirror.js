"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createNetflixMirror = createNetflixMirror;
exports.createPrimeMirror = createPrimeMirror;
exports.createDisneyMirror = createDisneyMirror;
const PLATFORMS = {
  nf: {
    ott: 'nf',
    label: 'Netflix',
    name: 'NetflixMirror',
    classPath: 'MOVIES.NetflixMirror',
    path: '',
    cookieOtt: 'nf',
    seriesYearIsFirstAired: true,
    poster: id => `https://imgcdn.kim/poster/v/${id}.jpg`,
    cover: id => `https://imgcdn.kim/poster/h/${id}.jpg`,
    episodeImage: id => `https://imgcdn.kim/epimg/150/${id}.jpg`
  },
  pv: {
    ott: 'pv',
    label: 'Prime Video',
    name: 'PrimeMirror',
    classPath: 'MOVIES.PrimeMirror',
    path: 'pv/',
    cookieOtt: 'pv',
    seriesYearIsFirstAired: true,
    poster: id => id.length > 10 ? `https://imgcdn.kim/pv/v/350/${id}.jpg` : `https://imgcdn.kim/pv/341/${id}.jpg`,
    cover: id => `https://imgcdn.kim/pv/1920/${id}.jpg`,
    episodeImage: id => `https://imgcdn.kim/pvepimg/${id}.jpg`
  },
  hs: {
    ott: 'hs',
    label: 'Disney+',
    name: 'DisneyMirror',
    classPath: 'MOVIES.DisneyMirror',
    path: 'hs/',
    cookieOtt: 'dp',
    seriesYearIsFirstAired: false,
    poster: id => `https://imgcdn.kim/hs/v/${id}.jpg`,
    cover: id => `https://imgcdn.kim/hs/h/${id}.jpg`,
    episodeImage: id => `https://imgcdn.kim/hsepimg/${id}.jpg`
  }
};
// The site only serves real data to its Android app UA once a session is verified.
const APP_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const UNLOCK_TIMEOUT_MS = 60 * 1000;
// The site's TV API serves search and title metadata without a verified session,
// so only playback has to wait for the (slow) session unlock.
const NEWTV_API = 'https://tv.imgcdn.kim';
const NEWTV_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0';
// One verified session works for every catalog, so share it across platforms and instances.
const sessions = new Map();
const pendingUnlocks = new Map();
function createNetMirror(ctx, platform, customBaseURL) {
  const {
    enums,
    axios: ctxAxios,
    createCustomBaseUrl
  } = ctx;
  // React Native sends its native cookie jar with every request unless withCredentials is false,
  // and on Android the jar replaces the Cookie headers set here. With a stored session cookie the
  // site then serves an already-unlocked home page (no data-addhash, and no Set-Cookie to read the
  // token from) and never sees the ott cookie that picks the platform. This provider sends its own
  // cookies, so every request opts out of the jar, as requests in Node do.
  const axios = {
    get: (url, options) => ctxAxios.get(url, {
      ...options,
      withCredentials: false
    }),
    post: (url, data, options) => ctxAxios.post(url, data, {
      ...options,
      withCredentials: false
    })
  };
  const {
    TvType: TvTypeEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://net52.cc', customBaseURL);
  const config = {
    name: platform.name,
    languages: 'all',
    classPath: platform.classPath,
    logo: `${baseUrl}/img/nf2/icon_x192.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true
  };
  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const now = () => Math.round(Date.now() / 1000);
  const readSetCookies = headers => {
    const raw = headers?.['set-cookie'] ?? headers?.['x-set-cookie'] ?? [];
    return (Array.isArray(raw) ? raw : [raw]).map(String);
  };
  // `::99` marks a placeholder token the server hands out before verification.
  const extractToken = cookies => {
    for (const cookie of cookies) {
      const match = /t_hash_t=([^;,]+)/.exec(cookie);
      if (!match) continue;
      const token = decodeURIComponent(match[1]);
      if (token && !token.includes('::99')) return token;
    }
    return undefined;
  };
  const storeToken = token => {
    sessions.set(baseUrl, {
      token,
      ts: Date.now()
    });
    return token;
  };
  // Mirrors the app's sponsor-ad verification: open home, register the ad visit, then
  // poll verify2.php until the server marks the session verified (~20-40s).
  const unlockSession = async () => {
    const home = await axios.get(`${baseUrl}/mobile/home?app=1`, {
      headers: {
        'User-Agent': APP_UA,
        'X-Requested-With': 'com.netmirror.app',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });
    const homeCookies = readSetCookies(home.headers);
    const alreadyVerified = extractToken(homeCookies);
    if (alreadyVerified) return storeToken(alreadyVerified);
    const addhash = /data-addhash=["']([^"']+)["']/.exec(String(home.data))?.[1];
    if (!addhash) throw new Error('session unlock failed: no addhash on home page');
    const initialCookie = homeCookies.map(cookie => cookie.split(';')[0]).filter(Boolean).join('; ');
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    await axios.get(`https://userver.${host}/?hee5=${addhash}&a=y&t=${Math.random()}`, {
      headers: {
        'User-Agent': APP_UA,
        'Referer': `${baseUrl}/mobile/home?app=1`,
        'Cookie': initialCookie
      },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 10000
    }).catch(() => undefined);
    const pollCookie = ['ext_name=ojplmecpdpgccookcobabopnaifgidhf', `addhash=${encodeURIComponent(addhash)}`, initialCookie].filter(Boolean).join('; ');
    const deadline = Date.now() + UNLOCK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(2000);
      const res = await axios.post(`${baseUrl}/mobile/verify2.php`, `verify=${encodeURIComponent(addhash)}`, {
        headers: {
          'User-Agent': APP_UA,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': `${baseUrl}/mobile/home`,
          'Origin': baseUrl,
          'Cookie': pollCookie
        },
        validateStatus: () => true,
        timeout: 10000
      }).catch(() => undefined);
      if (!res) continue;
      const token = extractToken(readSetCookies(res.headers));
      if (token) return storeToken(token);
      if (res.data?.statusup === 'All Done') {
        const reload = await axios.get(`${baseUrl}/mobile/home?app=1`, {
          headers: {
            'User-Agent': APP_UA,
            'X-Requested-With': 'com.netmirror.app',
            'Cookie': pollCookie
          },
          timeout: 15000
        });
        const verified = extractToken(readSetCookies(reload.headers));
        if (verified) return storeToken(verified);
        break;
      }
    }
    throw new Error('session unlock did not complete');
  };
  const getSessionToken = async function () {
    let forceRefresh = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    const cached = sessions.get(baseUrl);
    if (!forceRefresh && cached && Date.now() - cached.ts < SESSION_TTL_MS) return cached.token;
    if (forceRefresh) sessions.delete(baseUrl);
    let pending = pendingUnlocks.get(baseUrl);
    if (!pending) {
      pending = unlockSession().finally(() => pendingUnlocks.delete(baseUrl));
      pendingUnlocks.set(baseUrl, pending);
    }
    return pending;
  };
  const requestHeaders = token => ({
    'User-Agent': APP_UA,
    'Referer': `${baseUrl}/home`,
    'Origin': baseUrl,
    'Accept': 'application/json, text/plain, */*',
    'Cookie': `t_hash_t=${token}; hd=on; ott=${platform.cookieOtt}`
  });
  // Requests one endpoint; if the response says the session is not verified,
  // unlocks a fresh session and retries once.
  const getVerified = async (path, isUnverified) => {
    let token = await getSessionToken();
    let {
      data
    } = await axios.get(`${baseUrl}${path}`, {
      headers: requestHeaders(token)
    });
    if (!isUnverified(data)) return data;
    token = await getSessionToken(true);
    ({
      data
    } = await axios.get(`${baseUrl}${path}`, {
      headers: requestHeaders(token)
    }));
    if (isUnverified(data)) throw new Error('session not accepted by server');
    return data;
  };
  const rejectedStatus = data => data?.status === 'n';
  // Start unlocking in the background while the user browses, so playback rarely waits.
  const warmUpSession = () => {
    getSessionToken().catch(() => undefined);
  };
  const getNewTv = async path => {
    const {
      data
    } = await axios.get(`${NEWTV_API}/newtv/${path}`, {
      headers: {
        'Ott': platform.ott,
        'X-Requested-With': 'NetmirrorNewTV v1.0',
        'User-Agent': NEWTV_UA,
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 10000
    });
    return data;
  };
  const postUrl = id => `${baseUrl}/mobile/${platform.path}post.php?id=${id}`;
  const playlistUrl = id => `${baseUrl}/mobile/${platform.path}playlist.php?id=${id}`;
  // Search only returns id + title; meta providers (e.g. TMDB) match on type, year and
  // season count, so fill those in from each title's (session-free) post data.
  const withPostDetails = async result => {
    try {
      const post = await getNewTv(`post.php?id=${result.id}`);
      if (post?.status !== 'ok') return result;
      const isSeries = post.type === 't';
      return {
        ...result,
        type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
        seasons: isSeries ? post.season?.length || 1 : undefined,
        // TMDB requires an exact year match whenever any result has one, so omit years
        // entirely for catalogs that report a series' latest-season year.
        releaseDate: platform.seriesYearIsFirstAired ? post.year || undefined : undefined
      };
    } catch {
      return result;
    }
  };
  const searchNewTv = async query => {
    const data = await getNewTv(`search.php?s=${encodeURIComponent(query)}`);
    if (data?.status !== 'y') throw new Error('NewTV search unavailable');
    return Promise.all((data.searchResult ?? []).map(item => {
      const id = String(item.id);
      return withPostDetails({
        id,
        title: item.t,
        url: postUrl(id),
        image: platform.poster(id)
      });
    }));
  };
  const searchViaSession = async query => {
    const data = await getVerified(`/mobile/${platform.path}search.php?s=${encodeURIComponent(query)}&t=${now()}`, rejectedStatus);
    return (data.searchResult ?? []).map(item => {
      const id = String(item.id);
      return {
        id,
        title: item.t,
        url: postUrl(id),
        image: platform.poster(id),
        releaseDate: item.y,
        type: item.r === 'Series' ? TvTypeEnum.TVSERIES : item.r ? TvTypeEnum.MOVIE : undefined
      };
    });
  };
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    warmUpSession();
    try {
      const results = await searchNewTv(query).catch(() => searchViaSession(query));
      return {
        currentPage: page,
        hasNextPage: false,
        results
      };
    } catch (err) {
      throw new Error(`${config.name} search failed: ${err.message}`);
    }
  };
  const mapEpisode = (ep, fallbackSeason) => ({
    id: ep.id,
    title: ep.t,
    number: parseInt(ep.ep.replace(/\D/g, ''), 10) || undefined,
    season: parseInt(ep.s.replace(/\D/g, ''), 10) || fallbackSeason,
    url: playlistUrl(ep.id),
    description: ep.ep_desc,
    duration: ep.time,
    image: platform.episodeImage(ep.id)
  });
  const movieEpisodes = (mediaId, title) => [{
    id: mediaId,
    title: title || 'Full Movie',
    number: 1,
    season: 1,
    url: playlistUrl(mediaId)
  }];
  const fetchSeasonEpisodes = async (seasonId, seriesId, seasonNumber) => {
    const token = await getSessionToken();
    const episodes = [];
    for (let page = 1; page <= 20; page++) {
      const {
        data
      } = await axios.get(`${baseUrl}/mobile/${platform.path}episodes.php?s=${seasonId}&series=${seriesId}&t=${now()}&page=${page}`, {
        headers: requestHeaders(token)
      });
      for (const ep of data.episodes ?? []) {
        if (ep) episodes.push(mapEpisode(ep, seasonNumber));
      }
      if (!data.nextPageShow) break;
    }
    return episodes;
  };
  const splitList = value => value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];
  const baseInfo = (mediaId, post) => ({
    id: mediaId,
    title: post.title || '',
    url: postUrl(mediaId),
    type: post.type === 't' ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
    image: platform.poster(mediaId),
    cover: platform.cover(mediaId),
    releaseDate: post.year || undefined
  });
  const mapNewTvEpisode = (ep, season) => ({
    id: ep.id,
    title: ep.t,
    number: parseInt(ep.ep, 10) || undefined,
    season,
    url: playlistUrl(ep.id),
    description: ep.ep_desc,
    duration: ep.info?.find(part => /^\d+\s*m(in)?$/i.test(part)),
    // Only some catalogs include an air date, e.g. "9 Jun 2021".
    releaseDate: ep.info?.find(part => /[a-z]/i.test(part) && /\b\d{4}\b/.test(part)),
    image: platform.episodeImage(ep.id)
  });
  const fetchNewTvSeasonEpisodes = async (seasonId, seriesId, season) => {
    const episodes = [];
    for (let page = 1; page <= 20; page++) {
      const data = await getNewTv(`episodes.php?id=${seasonId}&series=${seriesId}&page=${page}`);
      for (const ep of data.episodes ?? []) {
        if (ep) episodes.push(mapNewTvEpisode(ep, season));
      }
      if (!data.nextPageShow) break;
    }
    return episodes;
  };
  const fetchMediaInfoNewTv = async mediaId => {
    const post = await getNewTv(`post.php?id=${mediaId}`);
    if (post?.status !== 'ok') throw new Error('NewTV title unavailable');
    const detail = key => post.moredetails?.find(d => d.k === key)?.v;
    const info = {
      ...baseInfo(mediaId, post),
      genres: splitList(detail('Genre') ?? detail('HotStar Genres') ?? detail('IMDB Genres')),
      casts: splitList(detail('Cast')),
      rating: parseFloat(detail('IMDB Rating') ?? '') || undefined,
      duration: post.type === 't' ? undefined : post.runtime,
      description: post.desc || ''
    };
    if (post.type !== 't') {
      info.episodes = movieEpisodes(mediaId, post.title);
      return info;
    }
    if (post.season?.length) {
      const perSeason = await Promise.all(post.season.map((season, index) => fetchNewTvSeasonEpisodes(season.id, mediaId, parseInt(/(\d+)/.exec(season.s)?.[1] ?? '', 10) || index + 1)));
      info.episodes = perSeason.flat();
    } else {
      info.episodes = (post.episodes ?? []).filter(ep => Boolean(ep)).map(ep => mapNewTvEpisode(ep, 1));
    }
    info.totalEpisodes = info.episodes.length;
    // Disney+ reports the latest season's year; prefer the earliest episode air date when present.
    const airYears = info.episodes.map(ep => /\b(\d{4})\b/.exec(String(ep.releaseDate ?? ''))?.[1]).filter(year => Boolean(year));
    if (airYears.length) info.releaseDate = airYears.sort()[0];
    return info;
  };
  const fetchMediaInfoViaSession = async mediaId => {
    const post = await getVerified(`/mobile/${platform.path}post.php?id=${mediaId}&t=${now()}`, rejectedStatus);
    const info = {
      ...baseInfo(mediaId, post),
      genres: splitList(post.genre),
      casts: splitList(post.cast),
      duration: post.type === 't' ? undefined : post.runtime,
      description: post.desc || post.m_desc || ''
    };
    if (post.type !== 't') {
      info.episodes = movieEpisodes(mediaId, post.title);
      return info;
    }
    if (post.season?.length) {
      const perSeason = await Promise.all(post.season.map(season => fetchSeasonEpisodes(season.id, mediaId, parseInt(season.s.replace(/\D/g, ''), 10) || 1)));
      info.episodes = perSeason.flat();
    } else {
      info.episodes = (post.episodes ?? []).filter(ep => Boolean(ep)).map(ep => mapEpisode(ep, 1));
    }
    info.totalEpisodes = info.episodes.length;
    return info;
  };
  const fetchMediaInfo = async mediaId => {
    warmUpSession();
    try {
      return await fetchMediaInfoNewTv(mediaId).catch(() => fetchMediaInfoViaSession(mediaId));
    } catch (err) {
      throw new Error(`${config.name} fetchMediaInfo failed: ${err.message}`);
    }
  };
  const playlistPath = episodeId => `/mobile/${platform.path}playlist.php?id=${episodeId}&t=x&tm=${now()}`;
  const fetchEpisodeServers = async (episodeId, mediaId) => {
    return [{
      name: platform.label,
      url: `${baseUrl}${playlistPath(episodeId)}`
    }];
  };
  const qualityFromLabel = label => {
    const normalized = label.toLowerCase();
    if (normalized.includes('full hd')) return '1080p';
    if (normalized.includes('mid hd')) return '720p';
    if (normalized.includes('low hd')) return '480p';
    if (normalized.includes('auto')) return 'auto';
    return label;
  };
  // The CDN serving variant playlists and segments rejects requests without this Referer.
  const hlsHeaders = {
    'Referer': `${baseUrl}/`,
    'User-Agent': APP_UA
  };
  /**
   * The playlist lists every quality, but a quality the title doesn't have comes back as a master
   * playlist with audio tracks and no video stream, which players reject as malformed. Keep the
   * sources whose master has a video stream; one that can't be checked (network error) is kept.
   */
  const withVideoStreams = async sources => {
    const checks = await Promise.all(sources.map(source => axios.get(source.url, {
      headers: hlsHeaders,
      responseType: 'text',
      timeout: 10000
    }).then(_ref => {
      let {
        data
      } = _ref;
      return typeof data !== 'string' || data.includes('#EXT-X-STREAM-INF');
    }).catch(() => true)));
    const playable = sources.filter((_, i) => checks[i]);
    return playable.length ? playable : sources;
  };
  const fetchEpisodeSources = async (episodeId, mediaId) => {
    try {
      // Without a verified session the server still returns a playlist, but every
      // source is a teaser stream tagged `in=unknown`.
      const data = await getVerified(playlistPath(episodeId), res => {
        const playlist = Array.isArray(res) ? res[0] : res;
        return Boolean(playlist?.sources?.some(s => s.file.includes('in=unknown')));
      });
      const playlist = Array.isArray(data) ? data[0] : data;
      if (!playlist?.sources?.length) throw new Error('No sources in playlist');
      const listed = playlist.sources.map(s => ({
        url: s.file.startsWith('http') ? s.file : `${baseUrl}${s.file}`,
        quality: qualityFromLabel(s.label || ''),
        isM3U8: true
      }));
      const sources = await withVideoStreams(listed);
      const subtitles = (playlist.tracks ?? []).filter(t => t.kind === 'captions' && t.file).map(t => ({
        url: t.file.startsWith('//') ? `https:${t.file}` : t.file,
        lang: t.label || t.language || 'Unknown'
      }));
      return {
        headers: hlsHeaders,
        sources,
        subtitles
      };
    } catch (err) {
      throw new Error(`${config.name} fetchEpisodeSources failed: ${err.message}`);
    }
  };
  const fetchHlsPlaylist = async episodeId => {
    try {
      const {
        sources,
        headers
      } = await fetchEpisodeSources(episodeId);
      const master = sources.find(s => s.quality === 'auto') ?? sources[0];
      const {
        data
      } = await axios.get(master.url, {
        headers,
        responseType: 'text'
      });
      return data;
    } catch (err) {
      throw new Error(`${config.name} fetchHlsPlaylist failed: ${err.message}`);
    }
  };
  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
    fetchHlsPlaylist
  };
}
function createNetflixMirror(ctx, customBaseURL) {
  return createNetMirror(ctx, PLATFORMS.nf, customBaseURL);
}
function createPrimeMirror(ctx, customBaseURL) {
  return createNetMirror(ctx, PLATFORMS.pv, customBaseURL);
}
function createDisneyMirror(ctx, customBaseURL) {
  return createNetMirror(ctx, PLATFORMS.hs, customBaseURL);
}
//# sourceMappingURL=create-netflixmirror.js.map