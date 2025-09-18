import axios from 'axios';
import type { IEpisodeServer, ISource, ISubtitle, IVideo } from '../../../models';
import { load } from 'cheerio';
import { URL } from '../../../utils/url-polyfill';
import CryptoJS from 'crypto-js';

export async function getVidsrcSourcesAndServers(id: string): Promise<ISource & { servers: IEpisodeServer[] }> {
  const parts = id.split('$');
  const [tmdbId, type, episode, season] = parts;
  const baseURL = 'https://vidsrc.xyz/embed/';
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Referer': 'https://vidsrc.xyz/',
  };
  const servers: IEpisodeServer[] = [];
  const sources: IVideo[] = [];
  const url =
    type === 'tv'
      ? `${baseURL}tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `${baseURL}movie?tmdb=${tmdbId}`;

  try {
    // Step 1: Fetch embed iframe
    const { data: html1 } = await axios.get(url, { headers });
    const match1 = html1.match(/src="(.*?)"/)?.[1];
    if (!match1) throw new Error('No source iframe found');
    const allUrlRCP: any = [];
    // Construct the RCP URL
    const urlRCP = match1.startsWith('http')
      ? match1
      : match1.startsWith('/embed')
        ? baseURL.split('/embed')[0] + match1
        : 'https:' + match1;

    const $ = load(html1);
    $('.serversList .server').each((i, el) => {
      const name = $(el).text().trim();
      const hash = $(el).attr('data-hash');
      allUrlRCP.push({ name, url: `${urlRCP.split('rcp')[0]}rcp/${hash!}` });
    });
    // Step 2: Fetch all URLs from allUrlRCP and process them
    await Promise.all(
      allUrlRCP.map(async ({ name, url: rcpUrl }: { name: string; url: string }) => {
        try {
          // console.log(`Fetching RCP for ${name} from ${rcpUrl}`);
          const { data: html2 } = await axios.get(rcpUrl, {
            headers: { ...headers, Referer: url },
          });
          // console.log(`Found RCP for ${name}: ${html2}`);
          const match2 = html2.match(/src.*['"](\/(?:src|pro)rcp.*?)['"]/)?.[1];
          if (!match2) return;

          const urlPRORCP = rcpUrl.split('rcp')[0] + match2;

          // Step 3: Fetch M3U8 file URL
          // console.log(`Fetching M3U8 for ${name} from ${urlPRORCP}`);
          const { data: html3 } = await axios.get(urlPRORCP, {
            headers: { ...headers, Referer: rcpUrl },
          });
          const match3 = html3.match(/file:\s*['"]([^'"]+\.m3u8)['"]/)?.[1];
          // console.log(`Found M3U8 for ${name}: ${match3}`);
          if (match3) {
            servers.push({
              name: name,
              url: match3,
            });
            sources.push({
              url: match3,
              isM3U8: match3.includes('.m3u8'),
              quality: 'default',
              name: name,
            });
          }
        } catch (error) {
          // Silently continue on error for individual servers
          return;
        }
      })
    );
    return {
      servers,
      sources,
      headers: { Referer: urlRCP.split('rcp')[0] },
    };
  } catch (error) {
    throw new Error(`Failed to fetch Vidsrc stream: ${(error as Error).message}`);
  }
}

export async function get111MoviesSourcesAndServers(id: string): Promise<ISource & { servers: IEpisodeServer[] }> {
  const parts = id.split('$');
  const [tmdbId, type, episode, season] = parts;
  const baseUrl = 'https://111movies.com';
  const userAgent =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

  const defaultDomain = (() => {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}/`;
  })();

  const headers = {
    'Referer': defaultDomain,
    'User-Agent': userAgent,
    // 'Content-Type': 'image/gif',
    'X-Requested-With': 'XMLHttpRequest',
  };
  function customEncode(input: string): string {
    const src = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    const dst = 'BdNqfj2X1RalybZHxP50e8UGz4Tv6mg3QS-7JnAWIsiKrCpFktVM9D_chuYOoEwL';

    // Normal base64 url-safe
    let b64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input));
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]+$/, '');

    // Translate characters
    let result = '';
    for (const ch of b64) {
      const idx = src.indexOf(ch);
      result += idx >= 0 ? dst[idx] : ch;
    }
    return result;
  }
  let url;
  if (type === 'tv') {
    url = `${baseUrl}/tv/${tmdbId}/${season}/${episode}`;
  } else {
    url = `${baseUrl}/movie/${tmdbId}`;
  }
  const res = await axios.get(url, { headers });
  const html = res.data as string;

  // Extract raw data
  const match = html.match(/\{\"data\":\"(.*?)\"/);
  if (!match) {
    console.error('No data found!');
    throw new Error('No data found in the response');
  }
  const rawData = match[1];

  // AES CBC encrypt
  const keyHex = '912660f3d9f3f35cee36396d31ed73366ab53c22c70710ce029697d17762997e';
  const ivHex = 'f91f2863783814f51c56f341d6ce1677';

  const aesKey = CryptoJS.enc.Hex.parse(keyHex);
  const aesIv = CryptoJS.enc.Hex.parse(ivHex);

  const padded = CryptoJS.enc.Utf8.parse(rawData!);
  const encrypted = CryptoJS.AES.encrypt(padded, aesKey, {
    iv: aesIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Python used .hex(), CryptoJS AES output is base64 → convert to hex
  // AES ciphertext in hex (same as Python's .hex())
  const aesEncryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

  // XOR key as a Uint8Array instead of Buffer
  const xorKey = new Uint8Array([0xbe, 0x43, 0x0a]);

  let xorResult = '';
  for (let i = 0; i < aesEncryptedHex.length; i++) {
    const charCode = aesEncryptedHex.charCodeAt(i);
    xorResult += String.fromCharCode(charCode ^ xorKey[i % xorKey.length]!);
  }

  // Encode final
  const encodedFinal = customEncode(xorResult);

  // API call
  const staticPath =
    'to/1000003134441812/c945be05/2f30b6e198562e7015537bb71a738ff8245942a7/y/2c20617150078ad280239d1cc3a8b6ee9331acef9b0bdc6b742435597c38edb4/c8ddbffe-3efb-53e1-b883-3b6ce90ba310';

  const apiServers = `https://111movies.com/${staticPath}/${encodedFinal}/sr`;
  const { data: serversData } = await axios.post(apiServers, {}, { headers });
  // const servers = serverRes.data;

  if (!Array.isArray(serversData) || serversData.length === 0) {
    console.error('No servers found!');
    throw new Error('No servers found in the response');
  }
  const servers: IEpisodeServer[] = serversData.map((s: any) => ({
    name: s.name,
    url: `https://111movies.com/${staticPath}/${s.data}`,
  }));

  const sources: IVideo[] = [];
  let subtitles: ISubtitle[] = [];

  // console.log(subtitles);
  for (const server of servers) {
    try {
      const { data: streamData } = await axios.post(server.url, {}, { headers });
      if (streamData.tracks && streamData.tracks.length > 0) {
        const newSubs = streamData.tracks.map((sub: any) => ({
          url: sub.file,
          lang: sub.label,
        }));

        const allSubs = [...subtitles, ...newSubs];
        const uniqueSubs = allSubs.filter(
          (sub, index, self) => index === self.findIndex((s) => s.lang === sub.lang)
        ) as ISubtitle[];

        subtitles = uniqueSubs;
      }

      sources.push({
        url: streamData.url,
        isM3U8: streamData.url.includes('.m3u8'),
        quality: 'default',
        name: server.name,
      });
    } catch (err) {
      // ignore bad ones
    }
  }

  return {
    servers,
    sources,
    subtitles,
  };
}

export async function getMultiServers(id: string): Promise<IEpisodeServer[]> {
  try {
    const servers: IEpisodeServer[] = [];
    const [{ servers: oneoneoneServers }, { servers: vidsrcServers }] = await Promise.all([
      get111MoviesSourcesAndServers(id),
      getVidsrcSourcesAndServers(id),
    ]);
    servers.push(...oneoneoneServers, ...vidsrcServers);

    return servers;
  } catch (error) {
    throw new Error(`Failed to fetch Multistream servers: ${(error as Error).message}`);
  }
}

export async function getMultiSources(id: string, server: string): Promise<ISource> {
  try {
    const [{ servers: _, ...oneoneoneSources }, { servers: __, ...vidsrcSources }] = await Promise.all([
      get111MoviesSourcesAndServers(id),
      getVidsrcSourcesAndServers(id),
    ]);

    const allSources = {
      ...oneoneoneSources,
      ...vidsrcSources,
      sources: [...(oneoneoneSources.sources || []), ...(vidsrcSources.sources || [])],
      subtitles: [...(oneoneoneSources.subtitles || []), ...(vidsrcSources.subtitles || [])],
    };

    const matchedSources = allSources.sources?.filter((source: IVideo) => source.name === server) || [];

    if (matchedSources.length === 0) {
      throw new Error(`No sources found for server: ${server}`);
    }

    return {
      sources: matchedSources,
      subtitles: allSources.subtitles || [],
    };
  } catch (error) {
    throw new Error(`Failed to fetch MultiSources: ${(error as Error).message}`);
  }
}
