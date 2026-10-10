"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const models_1 = require("../../../models");
const url_polyfill_1 = require("../../../utils/url-polyfill");
function createReanime(ctx, customBaseURL) {
  const {
    axios,
    load,
    enums,
    createCustomBaseUrl,
    extractors,
    NativeConsumet
  } = ctx;
  const {
    makeGetRequestWithWebView
  } = NativeConsumet;
  const {
    MediaStatus: MediaStatusEnum,
    SubOrDub: SubOrDubEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://reanime.to', customBaseURL);
  const apiBase = `${baseUrl}/api/v1`;
  const config = {
    name: 'ReAnime',
    languages: 'en',
    classPath: 'ANIME.ReAnime',
    logo: 'https://reanime.to/favicon-32x32.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  const extractorCtx = {
    axios,
    load,
    CryptoJS: ctx.CryptoJS,
    USER_AGENT: UA,
    PolyURL: ctx.PolyURL,
    PolyURLSearchParams: ctx.PolyURLSearchParams,
    NativeConsumet: ctx.NativeConsumet
  };
  const hdrs = referer => ({
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': referer ?? `${baseUrl}/`
  });
  const toMediaStatus = s => {
    switch (s?.toLowerCase()) {
      case 'releasing':
        return MediaStatusEnum.ONGOING;
      case 'finished':
        return MediaStatusEnum.COMPLETED;
      case 'not_yet_released':
        return MediaStatusEnum.NOT_YET_AIRED;
      case 'cancelled':
        return MediaStatusEnum.CANCELLED;
      default:
        return MediaStatusEnum.UNKNOWN;
    }
  };
  const pickTitle = t => t?.english || t?.romaji || t?.native || '';
  const pickCover = c => c?.extra_large || c?.large || c?.medium || '';
  const watchPageHtml = async (animeId, epNumber, lang) => {
    const url = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
    const res = await makeGetRequestWithWebView(url, {
      'User-Agent': UA,
      'Referer': `${baseUrl}/`
    });
    return res.html ?? '';
  };
  const fetchEpisodeLinks = async (animeId, epNumber) => {
    const tz = encodeURIComponent('America/New_York');
    const apiUrl = `${apiBase}/watch/${animeId}?ep=${epNumber}&tz=${tz}`;
    const res = await makeGetRequestWithWebView(apiUrl, {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Referer': `${baseUrl}/watch/${animeId}?ep=${epNumber}`
    });
    // Strip any HTML scaffolding the WebView adds around the JSON body
    const jsonText = (res.html ?? '').replace(/<[^>]*>/g, '').trim();
    if (!jsonText) return [];
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed.episode_links) ? parsed.episode_links : [];
    } catch {
      return [];
    }
  };
  const parseServersWithUrls = (html, subOrDub) => {
    const $ = load(html);
    const seen = new Set();
    const servers = [];
    const targetLabel = subOrDub === SubOrDubEnum.DUB ? 'DUB:' : 'SUB:';
    // iframe src is decoded by cheerio (html entities → chars)
    const iframeSrc = $('#video-player').attr('src') ?? '';
    $('span').each((_, spanEl) => {
      if ($(spanEl).text().trim() === targetLabel) {
        $(spanEl).parent().find('button.server-btn-enhanced').each((_, btn) => {
          const name = $(btn).text().trim();
          if (!name || seen.has(name)) return;
          seen.add(name);
          // Active server has "bg-primary" class; its URL is already in the iframe
          const url = $(btn).hasClass('bg-primary') ? iframeSrc : '';
          // Normalise to "flixcloud-hd-2" / "flixcloud-hd-1" so server selection works
          servers.push({
            name: `flixcloud-${name.toLowerCase().replace(/\s+/g, '-')}`,
            url
          });
        });
      }
    });
    return servers;
  };
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 20;
    const offset = (page - 1) * limit;
    const {
      data
    } = await axios.get(`${apiBase}/search`, {
      params: {
        q: query,
        limit,
        offset
      },
      headers: hdrs()
    });
    const total = data.total ?? 0;
    const results = (data.results ?? []).map(item => ({
      id: item.anime_id,
      title: pickTitle(item.title),
      url: `${baseUrl}/anime/${item.anime_id}`,
      image: pickCover(item.cover_image),
      type: item.format,
      status: toMediaStatus(item.status),
      genres: item.genres ?? [],
      sub: item.subbed ?? 0,
      dub: item.dubbed ?? 0
    }));
    return {
      currentPage: page,
      hasNextPage: offset + limit < total,
      totalResults: total,
      results
    };
  };
  const fetchEpisodes = async animeId => {
    const episodes = [];
    let page = 1;
    const limit = 100;
    while (true) {
      const {
        data
      } = await axios.get(`${apiBase}/anime/${animeId}/episodes`, {
        params: {
          page,
          limit
        },
        headers: hdrs(`${baseUrl}/anime/${animeId}`)
      });
      const batch = data.data ?? [];
      for (const ep of batch) {
        episodes.push({
          id: `${animeId}/${ep.episode_number}`,
          number: ep.episode_number,
          title: ep.title || `Episode ${ep.episode_number}`,
          image: ep.thumbnail || undefined,
          releaseDate: ep.aired || undefined,
          isFiller: ep.is_filler ?? false,
          isSubbed: ep.subbed ?? false,
          isDubbed: ep.dubbed ?? false,
          url: `${baseUrl}/watch/${animeId}?ep=${ep.episode_number}`
        });
      }
      if (batch.length < limit) break;
      page++;
    }
    return episodes;
  };
  const fetchAnimeInfo = async id => {
    const {
      data: anime
    } = await axios.get(`${apiBase}/anime/${id}`, {
      headers: hdrs(`${baseUrl}/anime/${id}`)
    });
    const info = {
      id: anime.anime_id ?? id,
      title: pickTitle(anime.title),
      url: `${baseUrl}/anime/${id}`,
      image: pickCover(anime.cover_image),
      cover: anime.banner_image || undefined,
      description: anime.description?.replace(/<[^>]*>/g, '').trim(),
      status: toMediaStatus(anime.status),
      type: anime.format,
      releaseDate: anime.season_year ? String(anime.season_year) : undefined,
      genres: anime.genres ?? [],
      studios: (anime.studios ?? []).filter(s => s.is_main).map(s => s.name),
      totalEpisodes: anime.episodes || anime.subbed || 0,
      sub: anime.subbed ?? 0,
      dub: anime.dubbed ?? 0,
      hasSub: (anime.subbed ?? 0) > 0,
      hasDub: (anime.dubbed ?? 0) > 0
    };
    info.episodes = await fetchEpisodes(id);
    return info;
  };
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const parts = episodeId.split('/');
    const animeId = parts[0];
    const epNumber = Number(parts[1]);
    const isDub = subOrDub === SubOrDubEnum.DUB;
    const episodeLinks = await fetchEpisodeLinks(animeId, epNumber);
    if (episodeLinks.length > 0) {
      return episodeLinks.filter(l => l.serverName && l.dataLink).map(l => ({
        // e.g. "HD-2" → "flixcloud-hd-2", "HD-1" → "flixcloud-hd-1"
        name: `flixcloud-${l.serverName.toLowerCase().replace(/\s+/g, '-')}`,
        // Site appends &a=1 to the FlixCloud URL for dub
        url: isDub ? `${l.dataLink}&a=1` : l.dataLink
      }));
    }
    const lang = isDub ? 'dub' : 'sub';
    const html = await watchPageHtml(animeId, epNumber, lang);
    const servers = parseServersWithUrls(html, subOrDub);
    if (!servers.length) throw new Error('[ReAnime] No servers found — user may not be logged in');
    return servers;
  };
  const fetchEpisodeSources = async function (episodeId) {
    let server = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : models_1.StreamingServers.FlixCloud;
    let subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    const parts = episodeId.split('/');
    const animeId = parts[0];
    const epNumber = parts[1];
    const lang = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
    const watchUrl = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
    const servers = await fetchEpisodeServers(episodeId, subOrDub);
    const idx = servers.findIndex(s => s.name.includes(server.toLowerCase()));
    if (idx === -1) {
      throw new Error(`[ReAnime] Server "${server}" not found. Available: ${servers.map(s => s.name).join(', ')}`);
    }
    const picked = servers[idx];
    if (!picked.url) throw new Error(`[ReAnime] No embed URL for server "${picked.name}" — user may not be logged in`);
    return extractors.FlixCloud(extractorCtx).extract(new url_polyfill_1.PolyURL(picked.url), watchUrl);
  };
  return {
    ...config,
    search,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources
  };
}
exports.default = createReanime;
//# sourceMappingURL=create-reanime.js.map