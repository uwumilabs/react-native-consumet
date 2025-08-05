import axios from 'axios';
import type { IEpisodeServer, ISource, ISubtitle, IVideo } from '../../../models';
import { USER_AGENT } from '../../../utils';
import { filterValidM3U8 } from '../../../utils/utils';
import { load } from 'cheerio';

export async function getRiveSourcesAndServers(id: string): Promise<ISource & { servers: IEpisodeServer[] }> {
  const parts = id.split('$');
  const [tmdbId, type, episode, season] = parts;
  const secret = generateSecretKey(Number(tmdbId));
  const riveServers = [
    'flowcast',
    'primevids',
    'loki',
    'shadow',
    'asiacloud',
    'hindicast',
    'anime',
    'animez',
    'sapphire',
    'guru',
    'guard',
    'curve',
    'hq',
    'ninja',
    'alpha',
    'kaze',
    'zenesis',
    'genesis',
    'zenith',
    'ghost',
    'halo',
    'kinoecho',
    'ee3',
    'volt',
    'putafilme',
    'ophim',
    'kage',
  ];
  const baseUrl = 'https://rivestream.org';
  const route =
    type === 'tv'
      ? `/api/backendfetch?requestID=tvVideoProvider&id=${tmdbId}&season=${season}&episode=${episode}&secretKey=${secret}&service=`
      : `/api/backendfetch?requestID=movieVideoProvider&id=${tmdbId}&secretKey=${secret}&service=`;
  const url = baseUrl + route;
  const subtitles: ISubtitle[] = [];
  const sources: IVideo[] = [];
  const servers: IEpisodeServer[] = [];
  await Promise.all(
    riveServers.map(async (server) => {
      // console.log('Rive: ' + url + server);
      try {
        const res = await axios.get(url + server, {
          timeout: 4000,
          headers: {
            'Referer': baseUrl,
            'User-Agent': USER_AGENT,
          },
        });

        if (res.data?.data?.captions) {
          res.data?.data?.captions.forEach((sub: any) => {
            subtitles.push({
              lang: sub?.label?.slice(0, 2) || 'Und',
              url: sub?.file,
            });
          });
        }

        res.data?.data?.sources.forEach((source: IVideo) => {
          servers.push({
            name: source?.source + '-' + source?.quality,
            url: source?.url,
          });
          sources.push({
            url: source?.url,
            isM3U8: source?.format === 'hls' ? true : false,
            quality: source?.quality,
            name: source?.source + '-' + source?.quality,
          });
        });
      } catch (e) {
        // console.log(e);
        return null;
      }
    })
  );
  const validUrls = await filterValidM3U8(sources.map((s) => s.url));
  return {
    sources: sources.filter((source) => validUrls.includes(source.url)),
    subtitles: subtitles.filter((sub) => sub.url && sub.lang),
    servers: servers.filter((source) => validUrls.includes(source.url)),
  };
}

function generateSecretKey(id: number | string) {
  // Array of secret key fragments - updated array from the new implementation
  const c = [
    'oYRu3JJ5g1C',
    'TRlWJIJXT',
    'RuoyGA0udvsFVXr',
    'Y4s2LNM4y',
    'wHzuSgl0fD',
    'MGLTaSGs',
    'rr0rSBIYfwutV7E',
    'ABJXC9c',
    'W2BuY0yDB9CcK',
    '3yvZP1OJuTM',
    'YDoqbu6zdN0zT',
    'rnNQ2a5OBaMu',
    'eSKa1Uy',
    'QsIV8J472Xa',
    'cPfTgu27',
    'j4mzadQCou9',
    'qHLZbLrZQfB',
    '8U9YP6hrTz4cJNQ',
    'xbAbu4pzFEXz',
    'dhuA9zvdw',
    'k3A1JGmb',
    'eVC3z4COdUNvvzA',
    'dwMmuXnrb',
    'AqpWzY9I1ZmGPR',
    'VGXWUm0JTetmXs',
    'gD4sH3CISTanpTs',
    'd6w8dntV',
    'iL6dvSNqEab4kd',
    'mIB8NFtmPjnX1kM',
    'F4PXdP0Hx3',
    '5Fijua4Z7C',
    'wPGnHJrkYa1Tu4P',
    'pjrfBfTf',
    'vswQDEbM0y64io',
    'LAnpQuk6hR2bEWs',
    'kX8orxNnkK',
    'mRsZ5fjHbC8YuT',
    'JnBr1jr',
    '2twFGU5PgvDmKdP',
    '3wCg6zYtHFjy',
    'gaQSJhixHiy1pa8',
    'pE2cXTP0GPX',
    'xr0ONW3sOnCRdt',
    'QZu43flHFsebX',
    'yrvtqRTOnHo',
    'kvXEs16lgj',
    'AGwT2zpQVHCMb09',
    'M4BxOh3z2JgC',
    '5hbV7briYC7',
    'YfHMsm0',
    'jC9PAPfz34Vgc',
    'ExoJ1tgEXpK',
    'eD8WPA4Lmsyf4W',
    'h7WSlhT7iNOj',
    'RRP61kk',
    'QtY0f1aN',
    'TlatGjcOQjup',
    'MfpeEGbjouYSOa',
    'Zz0Qh8B0pwUkdRT',
    'Y4SkLSQNU',
    'hOk01KFeEVbNRZx',
    'fyf4H8MXazm3oY',
    'Z116B9F2p',
    'GdxNJOnvdz',
    'kqVNNHfP',
    'IO3hhNu',
    'qDdC9Lcllce',
    'Et7lLOg',
    '6ZlQrvfgZu',
    'YXHLeZBF',
    'NH6nAd7y',
    'ARsut59gfK6j0v',
    'jPE2KXiJjnSsjn',
    'qYcG5HOJc3TtxM',
    'C2w06YGj5C',
    'kHx1pT7',
    '2enXfHXw',
    'koFHBiR054aizN',
    'Uj53XTQ92Ntbq7K',
    'QjC5euFYi2AuxWb',
    'njLwvdMejA',
    'NWMzrwTAVZEb',
    's4sVqC0AyTM5h',
    'pu01jeZ6AoH',
    'SgiOfwx9qkR',
    'grjsLtBNn9eTQg',
    'XABTTaYgihZk2mq',
    '2vlSCZQc3HT27F4',
    'kQZ7VQfEL3TC7P',
    'MEzqVne021W',
    'BLYPZp2SIO',
    '5zDMVoqw4nH',
    't14S9uLuGKX7Lb5',
    '4McODHAYTyp',
    'EAoxL5UKvMPqjH3',
    'hJpAbqp',
    'tcj63Wpz',
    'hGqEu0LxKkMv46P',
    'u2wNvb8ou19N3',
    'wUKY6Opi1kH',
  ];

  try {
    let e = (function (e) {
      if (e === undefined) {
        return 'rive';
      }
      try {
        let t;
        let n;
        let r = String(e);
        if (isNaN(Number(e))) {
          let e = r.split('').reduce((e, t) => e + t.charCodeAt(0), 0);
          t = c[e % c.length] || btoa(r);
          n = Math.floor((e % r.length) / 2);
        } else {
          let i = Number(e);
          t = c[i % c.length] || btoa(r);
          n = Math.floor((i % r.length) / 2);
        }
        let i = r.slice(0, n) + t + r.slice(n);
        let o = (function (e) {
          let t = String(e);
          let n = t.length ^ -559038737;
          for (let e = 0; e < t.length; e++) {
            let r = t.charCodeAt(e);
            r ^= ((e * 131 + 89) ^ (r << e % 5)) & 255;
            n = (((n << 7) | (n >>> 25)) >>> 0) ^ r;
            let i = (n & 65535) * 60205;
            let o = ((n >>> 16) * 60205) << 16;
            n = (i + o) >>> 0;
            n ^= n >>> 11;
          }
          n ^= n >>> 15;
          n = ((n & 65535) * 49842 + (((n >>> 16) * 49842) << 16)) >>> 0;
          n ^= n >>> 13;
          n = ((n & 65535) * 40503 + (((n >>> 16) * 40503) << 16)) >>> 0;
          n ^= n >>> 16;
          n = ((n & 65535) * 10196 + (((n >>> 16) * 10196) << 16)) >>> 0;
          return (n ^= n >>> 15).toString(16).padStart(8, '0');
        })(
          (function (e) {
            e = String(e);
            let t = 0;
            for (let n = 0; n < e.length; n++) {
              let r = e.charCodeAt(n);
              let i = (((t = (r + (t << 6) + (t << 16) - t) >>> 0) << n % 5) | (t >>> (32 - (n % 5)))) >>> 0;
              t ^= (i ^ ((r << n % 7) | (r >>> (8 - (n % 7))))) >>> 0;
              t = (t + ((t >>> 11) ^ (t << 3))) >>> 0;
            }
            t ^= t >>> 15;
            t = ((t & 65535) * 49842 + ((((t >>> 16) * 49842) & 65535) << 16)) >>> 0;
            t ^= t >>> 13;
            t = ((t & 65535) * 40503 + ((((t >>> 16) * 40503) & 65535) << 16)) >>> 0;
            return (t ^= t >>> 16).toString(16).padStart(8, '0');
          })(i)
        );
        return btoa(o);
      } catch (e) {
        return 'topSecret';
      }
    })(id);
    return e;
  } catch (e) {
    console.error('Error fetching data:', e);
  }
}

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

export async function getMultiServers(id: string): Promise<IEpisodeServer[]> {
  try {
    const servers: IEpisodeServer[] = [];
    const [{ servers: riveServers }, { servers: vidsrcServers }] = await Promise.all([
      getRiveSourcesAndServers(id),
      getVidsrcSourcesAndServers(id),
    ]);
    servers.push(...riveServers, ...vidsrcServers);

    return servers;
  } catch (error) {
    throw new Error(`Failed to fetch Multistream servers: ${(error as Error).message}`);
  }
}

export async function getMultiSources(id: string, server: string): Promise<ISource> {
  try {
    const [{ servers: _, ...riveSources }, { servers: __, ...vidsrcSources }] = await Promise.all([
      getRiveSourcesAndServers(id),
      getVidsrcSourcesAndServers(id),
    ]);

    const allSources = {
      ...riveSources,
      ...vidsrcSources,
      sources: [...(riveSources.sources || []), ...(vidsrcSources.sources || [])],
      subtitles: [...(riveSources.subtitles || []), ...(vidsrcSources.subtitles || [])],
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
