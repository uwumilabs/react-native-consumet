import type { IEpisodeServer, ISource, ISubtitle, IVideo, ProviderContext } from '../../../models';
import { ENC_DEC_API } from '../../common/enc-dec';
import { pickServer, serverName } from '../../common/servers';

/**
 * MultiStream ids, built and read only here: `<tmdbId>$movie` for a movie (its media id and its one
 * episode id), `<tmdbId>$tv` for a show, and `<tmdbId>$tv$<episode>$<season>$<tmdbEpisodeId>` for a
 * show's episode (the TMDB episode id keeps ids unique).
 */
export const toMediaId = (tmdbId: string | number, type: string) => `${tmdbId}$${type}`;

export const toEpisodeId = (tmdbId: string | number, episode: number, season: number, tmdbEpisodeId: number) =>
  `${tmdbId}$tv$${episode}$${season}$${tmdbEpisodeId}`;

export const parseId = (id: string) => {
  const [tmdbId = '', type = '', episode, season] = id.split('$');
  return { tmdbId, type, episode, season };
};

/**
 * What one site gives for an episode: its servers, and the sources and subtitles they play. A
 * scraper names its servers and their sources by the site's own labels; scrapeSite prefixes them.
 */
type Scraped = ISource & { servers: IEpisodeServer[] };
type Scraper = (ctx: ProviderContext, id: string) => Promise<Scraped>;

const scrapeVidsrc: Scraper = async ({ axios, load, USER_AGENT }, id) => {
  const { tmdbId, type, episode, season } = parseId(id);
  const baseURL = 'https://vidsrc-embed.ru/embed/';
  const headers = { 'User-Agent': USER_AGENT, 'Referer': 'https://vidsrc-embed.ru/' };
  const servers: IEpisodeServer[] = [];
  const sources: IVideo[] = [];
  const url =
    type === 'tv'
      ? `${baseURL}tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `${baseURL}movie?tmdb=${tmdbId}`;

  // The embed page links an RCP player page per server; each RCP page loads a PRORCP page whose
  // script names the m3u8.
  const { data: html1 } = await axios.get(url, { headers });
  const match1 = html1.match(/src="(.*?)"/)?.[1];
  if (!match1) throw new Error('No source iframe found');
  const urlRCP = match1.startsWith('http')
    ? match1
    : match1.startsWith('/embed')
      ? baseURL.split('/embed')[0] + match1
      : 'https:' + match1;

  const $ = load(html1);
  const rcpPages = $('.serversList .server')
    .get()
    .map((el) => ({ name: $(el).text().trim(), url: `${urlRCP.split('rcp')[0]}rcp/${$(el).attr('data-hash')!}` }));

  await Promise.all(
    rcpPages.map(async ({ name, url: rcpUrl }) => {
      try {
        const { data: html2 } = await axios.get(rcpUrl, { headers: { ...headers, Referer: url } });
        const match2 = html2.match(/src.*['"](\/(?:src|pro)rcp.*?)['"]/)?.[1];
        if (!match2) return;

        const { data: html3 } = await axios.get(rcpUrl.split('rcp')[0] + match2, {
          headers: { ...headers, Referer: rcpUrl },
        });
        const m3u8 = html3.match(/file:\s*['"]([^'"]+\.m3u8)['"]/)?.[1];
        if (m3u8) {
          servers.push({ name, url: m3u8 });
          sources.push({ url: m3u8, isM3U8: true, quality: 'default', name });
        }
      } catch {
        // A server whose pages fail is left out; the others still play.
      }
    })
  );
  return { servers, sources, headers: { Referer: urlRCP.split('rcp')[0] } };
};

const scrape111Movies: Scraper = async ({ axios, CryptoJS, USER_AGENT }, id) => {
  const { tmdbId, type, episode, season } = parseId(id);
  const baseUrl = 'https://111movies.com';
  const headers = { 'Referer': `${baseUrl}/`, 'User-Agent': USER_AGENT, 'X-Requested-With': 'XMLHttpRequest' };

  // URL-safe base64 with the site's own alphabet.
  const customEncode = (input: string): string => {
    const src = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    const dst = 'BdNqfj2X1RalybZHxP50e8UGz4Tv6mg3QS-7JnAWIsiKrCpFktVM9D_chuYOoEwL';
    const b64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/[=]+$/, '');
    let result = '';
    for (const ch of b64) {
      const idx = src.indexOf(ch);
      result += idx >= 0 ? dst[idx] : ch;
    }
    return result;
  };

  const url = type === 'tv' ? `${baseUrl}/tv/${tmdbId}/${season}/${episode}` : `${baseUrl}/movie/${tmdbId}`;
  const html = (await axios.get(url, { headers })).data as string;
  const rawData = html.match(/\{"data":"(.*?)"/)?.[1];
  if (!rawData) throw new Error('No data found in the response');

  // The page's data, AES-CBC encrypted with the site's key, hex-encoded, XORed and re-encoded,
  // names the episode's server list.
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(rawData),
    CryptoJS.enc.Hex.parse('912660f3d9f3f35cee36396d31ed73366ab53c22c70710ce029697d17762997e'),
    {
      iv: CryptoJS.enc.Hex.parse('f91f2863783814f51c56f341d6ce1677'),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  const aesEncryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const xorKey = [0xbe, 0x43, 0x0a];
  let xorResult = '';
  for (let i = 0; i < aesEncryptedHex.length; i++) {
    xorResult += String.fromCharCode(aesEncryptedHex.charCodeAt(i) ^ xorKey[i % xorKey.length]!);
  }

  const staticPath =
    'to/1000003134441812/c945be05/2f30b6e198562e7015537bb71a738ff8245942a7/y/2c20617150078ad280239d1cc3a8b6ee9331acef9b0bdc6b742435597c38edb4/c8ddbffe-3efb-53e1-b883-3b6ce90ba310';
  const { data: serversData } = await axios.post(
    `${baseUrl}/${staticPath}/${customEncode(xorResult)}/sr`,
    {},
    { headers }
  );
  if (!Array.isArray(serversData) || serversData.length === 0) throw new Error('No servers found in the response');
  const servers: IEpisodeServer[] = serversData.map((s: any) => ({
    name: s.name,
    url: `${baseUrl}/${staticPath}/${s.data}`,
  }));

  const sources: IVideo[] = [];
  let subtitles: ISubtitle[] = [];
  for (const server of servers) {
    try {
      const { data: streamData } = await axios.post(server.url, {}, { headers });
      if (streamData.tracks?.length > 0) {
        const allSubs: ISubtitle[] = [
          ...subtitles,
          ...streamData.tracks.map((sub: any) => ({ url: sub.file, lang: sub.label })),
        ];
        subtitles = allSubs.filter((sub, index) => index === allSubs.findIndex((s) => s.lang === sub.lang));
      }
      sources.push({
        url: streamData.url,
        isM3U8: streamData.url.includes('.m3u8'),
        quality: 'default',
        name: server.name,
      });
    } catch {
      // A server that fails to answer is left out of the sources; the others still play.
    }
  }
  return { servers, sources, subtitles };
};

const VIDEASY_SERVERS: IEpisodeServer[] = [
  { name: 'neon-org', url: 'https://api.videasy.net/myflixerzupcloud/sources-with-title' },
  { name: 'sage-org', url: 'https://api.videasy.net/1movies/sources-with-title' },
  { name: 'cypher-org', url: 'https://api.videasy.net/moviebox/sources-with-title' },
  { name: 'yoru-org', url: 'https://api.videasy.net/cdn/sources-with-title' },
  { name: 'reyna-org', url: 'https://api.videasy.net/primewire/sources-with-title' },
  { name: 'omen-org', url: 'https://api.videasy.net/onionplay/sources-with-title' },
  { name: 'breach-org', url: 'https://api.videasy.net/m4uhd/sources-with-title' },
  { name: 'vyse-org', url: 'https://api.videasy.net/hdmovie/sources-with-title' },
  { name: 'killjoy-ger', url: 'https://api.videasy.net/meine/sources-with-title?language=german' },
  { name: 'harbor-ita', url: 'https://api.videasy.net/meine/sources-with-title?language=italian' },
  { name: 'chamber-fr', url: 'https://api.videasy.net/meine/sources-with-title?language=french' },
  { name: 'fade-hin', url: 'https://api.videasy.net/hdmovie/sources-with-title' },
  { name: 'gekko-lat', url: 'https://api.videasy.net/cuevana-latino/sources-with-title' },
  { name: 'kayo-spa', url: 'https://api.videasy.net/cuevana-spanish/sources-with-title' },
  { name: 'raze-por', url: 'https://api.videasy.net/superflix/sources-with-title' },
  { name: 'phoenix-por', url: 'https://api.videasy.net/overflix/sources-with-title' },
  { name: 'astra-por', url: 'https://api.videasy.net/visioncine/sources-with-title' },
];

/** The sources and subtitles of enc-dec.app's decrypted answer, each source under the label `name` gives it. */
const decryptedMedia = (result: any, name: (source: any) => string) => ({
  sources: (Array.isArray(result?.sources) ? result.sources : []).map(
    (source: any): IVideo => ({
      url: source.url,
      isM3U8: source.url?.includes('.m3u8') || false,
      quality: source.quality || 'default',
      name: name(source),
    })
  ),
  subtitles: (Array.isArray(result?.subtitles) ? result.subtitles : []).map(
    (subtitle: any): ISubtitle => ({ url: subtitle.url, lang: subtitle.lang || subtitle.language || 'Unknown' })
  ),
});

const scrapeVideasy: Scraper = async ({ axios }, id) => {
  const { tmdbId, type, episode, season } = parseId(id);
  const sources: IVideo[] = [];
  const subtitles: ISubtitle[] = [];

  await Promise.all(
    VIDEASY_SERVERS.map(async (server) => {
      try {
        // Some servers' URLs already have a query (`?language=german`).
        const query =
          type === 'tv'
            ? `mediaType=tv&tmdbId=${tmdbId}&seasonId=${season}&episodeId=${episode}`
            : `mediaType=movie&tmdbId=${tmdbId}`;
        const url = `${server.url}${server.url.includes('?') ? '&' : '?'}${query}`;
        const { data: encData } = await axios.get(url);
        const { data: decData } = await axios.post(`${ENC_DEC_API}/dec-videasy`, { text: encData, id: tmdbId });
        const media = decryptedMedia(decData.result, () => server.name);
        sources.push(...media.sources);
        subtitles.push(...media.subtitles);
      } catch {
        // A server that fails is left out of the sources; the others still play.
      }
    })
  );
  return { servers: VIDEASY_SERVERS, sources, subtitles };
};

const scrapeHexa: Scraper = async ({ axios, CryptoJS, USER_AGENT }, id) => {
  const { tmdbId, type, episode, season } = parseId(id);
  // Hexa encrypts its answer with a key the client picks: 32 random bytes as hex.
  const key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const url =
    type === 'tv'
      ? `https://themoviedb.hexa.watch/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}/images`
      : `https://themoviedb.hexa.watch/api/tmdb/movie/${tmdbId}/images`;

  const { data: encData } = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'plain/text', 'X-Api-Key': key },
  });
  const { data: decData } = await axios.post(`${ENC_DEC_API}/dec-hexa`, { text: encData, key });
  const media = decryptedMedia(decData.result, (source) => source.server);
  return {
    servers: media.sources.map((source: IVideo) => ({ name: source.name!, url: source.url })),
    ...media,
  };
};

/**
 * The sites MultiStream reads, in the order their servers are listed. A server's name starts with
 * its site's (`videasy-neon-org`), which is how getMultiSources knows the one site to ask.
 */
const SITES: { name: string; scrape: Scraper }[] = [
  { name: '111movies', scrape: scrape111Movies },
  { name: 'vidsrc', scrape: scrapeVidsrc },
  { name: 'videasy', scrape: scrapeVideasy },
  { name: 'hexa', scrape: scrapeHexa },
];

/** A site's answer, its servers and their sources named `<site>-<label>` (serverName). */
const scrapeSite = async (ctx: ProviderContext, site: (typeof SITES)[number], id: string): Promise<Scraped> => {
  const scraped = await site.scrape(ctx, id);
  return {
    ...scraped,
    servers: scraped.servers.map((server) => ({ ...server, name: serverName(site.name, server.name) })),
    sources: scraped.sources.map((source) => ({ ...source, name: serverName(site.name, source.name as string) })),
  };
};

/** The answers of `sites` for the episode; a site that fails is left out, unless they all fail. */
const scrape = async (ctx: ProviderContext, id: string, sites: typeof SITES): Promise<Scraped[]> => {
  const settled = await Promise.allSettled(sites.map((site) => scrapeSite(ctx, site, id)));
  const results = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failure = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (!results.length && failure) throw failure.reason;
  return results;
};

export async function getMultiServers(ctx: ProviderContext, id: string): Promise<IEpisodeServer[]> {
  return (await scrape(ctx, id, SITES)).flatMap((result) => result.servers);
}

/**
 * The sources of one server (`pickServer`'s rule; the first server when omitted), the headers its
 * site needs, and the subtitles of the sites asked. Only the sites whose servers `server` can name
 * are asked: those whose name starts with it, or that it starts with. Every site without one.
 */
export async function getMultiSources(ctx: ProviderContext, id: string, server?: string): Promise<ISource> {
  const wanted = server?.toLowerCase();
  const sites = wanted ? SITES.filter(({ name }) => name.startsWith(wanted) || wanted.startsWith(name)) : SITES;
  if (!sites.length) {
    throw new Error(
      `Server '${server}' not found; server names start with ${SITES.map(({ name }) => name).join(', ')}`
    );
  }

  const results = await scrape(ctx, id, sites);
  const picked = pickServer(
    results.flatMap((result) => result.servers),
    server
  );
  const site = results.find((result) => result.servers.includes(picked))!;
  const sources = site.sources.filter((source) => source.name === picked.name);
  if (sources.length === 0) throw new Error(`No sources found for server: ${picked.name}`);

  return {
    ...(site.headers ? { headers: site.headers } : {}),
    sources,
    subtitles: results.flatMap((result) => result.subtitles ?? []),
  };
}
