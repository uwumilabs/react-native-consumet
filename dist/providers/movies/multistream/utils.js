"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseId = exports.toEpisodeId = exports.toMediaId = void 0;
exports.getMultiServers = getMultiServers;
exports.getMultiSources = getMultiSources;
const enc_dec_1 = require("../../common/enc-dec");
const servers_1 = require("../../common/servers");
/**
 * MultiStream ids, built and read only here: `<tmdbId>$movie` for a movie (its media id and its one
 * episode id), `<tmdbId>$tv` for a show, and `<tmdbId>$tv$<episode>$<season>$<tmdbEpisodeId>` for a
 * show's episode (the TMDB episode id keeps ids unique).
 */
const toMediaId = (tmdbId, type) => `${tmdbId}$${type}`;
exports.toMediaId = toMediaId;
const toEpisodeId = (tmdbId, episode, season, tmdbEpisodeId) => `${tmdbId}$tv$${episode}$${season}$${tmdbEpisodeId}`;
exports.toEpisodeId = toEpisodeId;
const parseId = id => {
  const [tmdbId = '', type = '', episode, season] = id.split('$');
  return {
    tmdbId,
    type,
    episode,
    season
  };
};
exports.parseId = parseId;
const getVidsrcSourcesAndServers = async (_ref, id) => {
  let {
    axios,
    load
  } = _ref;
  const {
    tmdbId,
    type,
    episode,
    season
  } = (0, exports.parseId)(id);
  const baseURL = 'https://vidsrc-embed.ru/embed/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Referer': 'https://vidsrc-embed.ru/'
  };
  const servers = [];
  const sources = [];
  const url = type === 'tv' ? `${baseURL}tv?tmdb=${tmdbId}&season=${season}&episode=${episode}` : `${baseURL}movie?tmdb=${tmdbId}`;
  // The embed page links an RCP player page per server; each RCP page loads a PRORCP page whose
  // script names the m3u8.
  const {
    data: html1
  } = await axios.get(url, {
    headers
  });
  const match1 = html1.match(/src="(.*?)"/)?.[1];
  if (!match1) throw new Error('No source iframe found');
  const urlRCP = match1.startsWith('http') ? match1 : match1.startsWith('/embed') ? baseURL.split('/embed')[0] + match1 : 'https:' + match1;
  const $ = load(html1);
  const rcpPages = $('.serversList .server').get().map(el => ({
    name: $(el).text().trim(),
    url: `${urlRCP.split('rcp')[0]}rcp/${$(el).attr('data-hash')}`
  }));
  await Promise.all(rcpPages.map(async _ref2 => {
    let {
      name,
      url: rcpUrl
    } = _ref2;
    try {
      const {
        data: html2
      } = await axios.get(rcpUrl, {
        headers: {
          ...headers,
          Referer: url
        }
      });
      const match2 = html2.match(/src.*['"](\/(?:src|pro)rcp.*?)['"]/)?.[1];
      if (!match2) return;
      const {
        data: html3
      } = await axios.get(rcpUrl.split('rcp')[0] + match2, {
        headers: {
          ...headers,
          Referer: rcpUrl
        }
      });
      const m3u8 = html3.match(/file:\s*['"]([^'"]+\.m3u8)['"]/)?.[1];
      if (m3u8) {
        servers.push({
          name,
          url: m3u8
        });
        sources.push({
          url: m3u8,
          isM3U8: true,
          quality: 'default',
          name
        });
      }
    } catch {
      // A server whose pages fail is left out; the others still play.
    }
  }));
  return {
    servers,
    sources,
    headers: {
      Referer: urlRCP.split('rcp')[0]
    }
  };
};
const get111MoviesSourcesAndServers = async (_ref3, id) => {
  let {
    axios,
    CryptoJS
  } = _ref3;
  const {
    tmdbId,
    type,
    episode,
    season
  } = (0, exports.parseId)(id);
  const baseUrl = 'https://111movies.com';
  const headers = {
    'Referer': `${baseUrl}/`,
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  };
  // URL-safe base64 with the site's own alphabet.
  const customEncode = input => {
    const src = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    const dst = 'BdNqfj2X1RalybZHxP50e8UGz4Tv6mg3QS-7JnAWIsiKrCpFktVM9D_chuYOoEwL';
    const b64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input)).replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');
    let result = '';
    for (const ch of b64) {
      const idx = src.indexOf(ch);
      result += idx >= 0 ? dst[idx] : ch;
    }
    return result;
  };
  const url = type === 'tv' ? `${baseUrl}/tv/${tmdbId}/${season}/${episode}` : `${baseUrl}/movie/${tmdbId}`;
  const html = (await axios.get(url, {
    headers
  })).data;
  const rawData = html.match(/\{"data":"(.*?)"/)?.[1];
  if (!rawData) throw new Error('No data found in the response');
  // The page's data, AES-CBC encrypted with the site's key, hex-encoded, XORed and re-encoded,
  // names the episode's server list.
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(rawData), CryptoJS.enc.Hex.parse('912660f3d9f3f35cee36396d31ed73366ab53c22c70710ce029697d17762997e'), {
    iv: CryptoJS.enc.Hex.parse('f91f2863783814f51c56f341d6ce1677'),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const aesEncryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const xorKey = [0xbe, 0x43, 0x0a];
  let xorResult = '';
  for (let i = 0; i < aesEncryptedHex.length; i++) {
    xorResult += String.fromCharCode(aesEncryptedHex.charCodeAt(i) ^ xorKey[i % xorKey.length]);
  }
  const staticPath = 'to/1000003134441812/c945be05/2f30b6e198562e7015537bb71a738ff8245942a7/y/2c20617150078ad280239d1cc3a8b6ee9331acef9b0bdc6b742435597c38edb4/c8ddbffe-3efb-53e1-b883-3b6ce90ba310';
  const {
    data: serversData
  } = await axios.post(`${baseUrl}/${staticPath}/${customEncode(xorResult)}/sr`, {}, {
    headers
  });
  if (!Array.isArray(serversData) || serversData.length === 0) throw new Error('No servers found in the response');
  const servers = serversData.map(s => ({
    name: s.name,
    url: `${baseUrl}/${staticPath}/${s.data}`
  }));
  const sources = [];
  let subtitles = [];
  for (const server of servers) {
    try {
      const {
        data: streamData
      } = await axios.post(server.url, {}, {
        headers
      });
      if (streamData.tracks?.length > 0) {
        const allSubs = [...subtitles, ...streamData.tracks.map(sub => ({
          url: sub.file,
          lang: sub.label
        }))];
        subtitles = allSubs.filter((sub, index) => index === allSubs.findIndex(s => s.lang === sub.lang));
      }
      sources.push({
        url: streamData.url,
        isM3U8: streamData.url.includes('.m3u8'),
        quality: 'default',
        name: server.name
      });
    } catch {
      // A server that fails to answer is left out of the sources; the others still play.
    }
  }
  return {
    servers,
    sources,
    subtitles
  };
};
const VIDEASY_SERVERS = [{
  name: 'neon-org',
  url: 'https://api.videasy.net/myflixerzupcloud/sources-with-title'
}, {
  name: 'sage-org',
  url: 'https://api.videasy.net/1movies/sources-with-title'
}, {
  name: 'cypher-org',
  url: 'https://api.videasy.net/moviebox/sources-with-title'
}, {
  name: 'yoru-org',
  url: 'https://api.videasy.net/cdn/sources-with-title'
}, {
  name: 'reyna-org',
  url: 'https://api.videasy.net/primewire/sources-with-title'
}, {
  name: 'omen-org',
  url: 'https://api.videasy.net/onionplay/sources-with-title'
}, {
  name: 'breach-org',
  url: 'https://api.videasy.net/m4uhd/sources-with-title'
}, {
  name: 'vyse-org',
  url: 'https://api.videasy.net/hdmovie/sources-with-title'
}, {
  name: 'killjoy-ger',
  url: 'https://api.videasy.net/meine/sources-with-title?language=german'
}, {
  name: 'harbor-ita',
  url: 'https://api.videasy.net/meine/sources-with-title?language=italian'
}, {
  name: 'chamber-fr',
  url: 'https://api.videasy.net/meine/sources-with-title?language=french'
}, {
  name: 'fade-hin',
  url: 'https://api.videasy.net/hdmovie/sources-with-title'
}, {
  name: 'gekko-lat',
  url: 'https://api.videasy.net/cuevana-latino/sources-with-title'
}, {
  name: 'kayo-spa',
  url: 'https://api.videasy.net/cuevana-spanish/sources-with-title'
}, {
  name: 'raze-por',
  url: 'https://api.videasy.net/superflix/sources-with-title'
}, {
  name: 'phoenix-por',
  url: 'https://api.videasy.net/overflix/sources-with-title'
}, {
  name: 'astra-por',
  url: 'https://api.videasy.net/visioncine/sources-with-title'
}];
/** The sources and subtitles of enc-dec.app's decrypted answer, under `name` (or each source's own server). */
const decryptedMedia = (result, name) => ({
  sources: (Array.isArray(result?.sources) ? result.sources : []).map(source => ({
    url: source.url,
    isM3U8: source.url?.includes('.m3u8') || false,
    quality: source.quality || 'default',
    name: name(source)
  })),
  subtitles: (Array.isArray(result?.subtitles) ? result.subtitles : []).map(subtitle => ({
    url: subtitle.url,
    lang: subtitle.lang || subtitle.language || 'Unknown'
  }))
});
const getVideasySourcesAndServers = async (_ref4, id) => {
  let {
    axios
  } = _ref4;
  const {
    tmdbId,
    type,
    episode,
    season
  } = (0, exports.parseId)(id);
  const sources = [];
  const subtitles = [];
  await Promise.all(VIDEASY_SERVERS.map(async server => {
    try {
      const url = type === 'tv' ? `${server.url}?mediaType=tv&tmdbId=${tmdbId}&seasonId=${season}&episodeId=${episode}` : `${server.url}?mediaType=movie&tmdbId=${tmdbId}`;
      const {
        data: encData
      } = await axios.get(url);
      const {
        data: decData
      } = await axios.post(`${enc_dec_1.ENC_DEC_API}/dec-videasy`, {
        text: encData,
        id: tmdbId
      });
      const media = decryptedMedia(decData.result, () => server.name);
      sources.push(...media.sources);
      subtitles.push(...media.subtitles);
    } catch {
      // A server that fails is left out of the sources; the others still play.
    }
  }));
  return {
    servers: VIDEASY_SERVERS,
    sources,
    subtitles
  };
};
const getHexaSourcesAndServers = async (_ref5, id) => {
  let {
    axios,
    CryptoJS
  } = _ref5;
  const {
    tmdbId,
    type,
    episode,
    season
  } = (0, exports.parseId)(id);
  // Hexa encrypts its answer with a key the client picks: 32 random bytes as hex.
  const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const url = type === 'tv' ? `https://themoviedb.hexa.watch/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}/images` : `https://themoviedb.hexa.watch/api/tmdb/movie/${tmdbId}/images`;
  const {
    data: encData
  } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Accept': 'plain/text',
      'X-Api-Key': key
    }
  });
  const {
    data: decData
  } = await axios.post(`${enc_dec_1.ENC_DEC_API}/dec-hexa`, {
    text: encData,
    key
  });
  const media = decryptedMedia(decData.result, source => `hexa-${source.server}`);
  return {
    servers: media.sources.map(source => ({
      name: source.name,
      url: source.url
    })),
    ...media
  };
};
/** The sites MultiStream reads, in the order their servers are listed. */
const SCRAPERS = [get111MoviesSourcesAndServers, getVidsrcSourcesAndServers, getVideasySourcesAndServers, getHexaSourcesAndServers];
/** Every site's answer for the episode; a site that fails is left out. */
const scrapeAll = async (ctx, id) => (await Promise.allSettled(SCRAPERS.map(scrape => scrape(ctx, id)))).flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
async function getMultiServers(ctx, id) {
  return (await scrapeAll(ctx, id)).flatMap(result => result.servers);
}
/**
 * The sources of one server (`pickServer`'s rule; the first server when omitted), the headers its
 * site needs, and the subtitles every site gave.
 */
async function getMultiSources(ctx, id, server) {
  const results = await scrapeAll(ctx, id);
  const picked = (0, servers_1.pickServer)(results.flatMap(result => result.servers), server);
  const site = results.find(result => result.servers.includes(picked));
  const sources = site.sources.filter(source => source.name === picked.name);
  if (sources.length === 0) throw new Error(`No sources found for server: ${picked.name}`);
  return {
    ...(site.headers ? {
      headers: site.headers
    } : {}),
    sources,
    subtitles: results.flatMap(result => result.subtitles ?? [])
  };
}
//# sourceMappingURL=utils.js.map