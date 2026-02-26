import {
  type IMovieInfo,
  type IEpisodeServer,
  type ISource,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

const OTT_PLATFORMS = [
  { code: 'nf', label: 'Netflix' },
  { code: 'pv', label: 'Prime Video' },
  { code: 'dp', label: 'Disney+' },
  { code: 'lg', label: 'Lionsgate' },
] as const;

type OttCode = (typeof OTT_PLATFORMS)[number]['code'];

interface NetMirrorSearchResult {
  head: string;
  type: number;
  searchResult: Array<{ id: string; t: string }>;
}

interface NetMirrorPostData {
  status: string;
  d_lang: string;
  title: string;
  year: string;
  ua: string;
  match: string;
  runtime: string;
  hdsd: string;
  type: string;
  genre: string;
  m_desc: string;
  desc: string;
  season?: Array<{
    s: string;
    id: string;
    ep: string;
    sele: string;
  }>;
  episodes?: Array<{
    complate: string;
    id: string;
    t: string;
    s: string;
    ep: string;
    ep_desc: string;
    time: string;
  }>;
}

interface NetMirrorPlaylist {
  title: string;
  image: string;
  sources: Array<{
    file: string;
    label: string;
    type: string;
    default?: string;
  }>;
  tracks: Array<{
    kind: string;
    file: string;
    label: string;
    language?: string;
  }>;
}

export type NetflixMirrorProviderInstance = {
  name: string;
  logo: string;
  baseUrl: string;
  classPath: string;
  supportedTypes: Set<any>;
  isNSFW: boolean;
  isWorking?: boolean;
  /**
   * Searches Netflix, Prime Video, Disney+ and Lionsgate in parallel.
   * Each result's `otherNames` array contains the platform label(s) it was found on.
   * Results are deduplicated by id; if the same id appears on multiple platforms
   * all platform labels are merged into `otherNames`.
   */
  search: (query: string, page?: number) => Promise<ISearch<IMovieResult>>;
  fetchMediaInfo: (mediaId: string) => Promise<IMovieInfo>;
  fetchEpisodeServers: (episodeId: string, mediaId?: string) => Promise<IEpisodeServer[]>;
  fetchEpisodeSources: (episodeId: string, mediaId?: string) => Promise<ISource>;
  fetchHlsPlaylist: (episodeId: string) => Promise<string>;
};

export function createNetflixMirror(ctx: ProviderContext, customBaseURL?: string): NetflixMirrorProviderInstance {
  const { enums, axios, createCustomBaseUrl, NativeConsumet } = ctx;
  const { TvType: TvTypeEnum } = enums;
  const { getDdosGuardCookiesWithWebView } = NativeConsumet;
  const baseUrl = createCustomBaseUrl('https://net20.cc', customBaseURL);

  const config: ProviderConfig = {
    name: 'NetMirror',
    languages: 'all',
    classPath: 'MOVIES.NetMirror',
    logo: 'https://net20.cc/img/nf2/icon_x192.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${config.baseUrl}/home`,
  };

  const getCookies = async (ottCode: OttCode = 'nf'): Promise<string> => {
    const res = await fetch(config.baseUrl + '/p.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'init=1',
    });

    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) throw new Error('No Set-Cookie header found');

    // Define the hardcoded t_hash_t as requested
    const t_hash_t = '988a734da1152ddea2c25c8904eede20%3A%3A0cb4f3935641c828678b8946867997e5%3A%3A1768993531%3A%3Ani';

    // Extract t_hash from the p.php response
    const tHashMatch = /t_hash=([^;]+)/.exec(setCookie);
    const t_hash = tHashMatch ? tHashMatch[1] : '';

    return `t_hash_t=${t_hash_t}; t_hash=${t_hash}; ott=${ottCode}`;
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    try {
      const resultSets = await Promise.allSettled(
        OTT_PLATFORMS.map(async ({ code, label }) => {
          const { data } = await axios.get<NetMirrorSearchResult>(
            `${config.baseUrl}/search.php?s=${encodeURIComponent(query)}&t=x`,
            { headers: { ...headers, Cookie: await getCookies(code) } }
          );
          if (!data.searchResult || !Array.isArray(data.searchResult)) return [];
          return data.searchResult.map((item) => ({ id: item.id, title: item.t, label }));
        })
      );

      // Merge results: deduplicate by id, collect all platform labels
      const map = new Map<string, IMovieResult>();
      for (const settled of resultSets) {
        if (settled.status !== 'fulfilled') continue;
        for (const item of settled.value) {
          if (map.has(item.id)) {
            (map.get(item.id)!.otherNames as string[]).push(item.label);
          } else {
            map.set(item.id, {
              id: item.id,
              title: item.title,
              image: `https://imgcdn.kim/poster/342/${item.id}.jpg`,
              type: TvTypeEnum.MOVIE,
              otherNames: [item.label],
            });
          }
        }
      }

      return { currentPage: page, hasNextPage: false, results: [...map.values()] };
    } catch (err) {
      throw new Error(`NetMirror search failed: ${(err as Error).message}`);
    }
  };

  const fetchPostData = async (id: string): Promise<NetMirrorPostData> => {
    try {
      const { data } = await axios.get<NetMirrorPostData>(`${config.baseUrl}/post.php?id=${id}&t=x`, {
        headers: {
          ...headers,
          Cookie: await getCookies(),
        },
      });
      return data;
    } catch (err) {
      throw new Error(`NetMirror fetchPostData failed: ${(err as Error).message}`);
    }
  };

  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    try {
      const postData = await fetchPostData(mediaId);
      const isTvShow = postData.type === 't';

      const movieInfo: IMovieInfo = {
        id: mediaId,
        title: postData.title || '',
        type: isTvShow ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
        image: `https://imgcdn.kim/poster/780/${mediaId}.jpg`,
        cover: `https://imgcdn.kim/poster/1920/${mediaId}.jpg`,
        genres: postData.genre?.split(',').map((g) => g.trim()) || [],
        duration: postData.runtime,
        description: postData.desc || postData.m_desc || '',
        // rating is a string in the response, but IMovieInfo expects a number.
        // We'll leave it undefined since we can't convert it reliably.
        rating: undefined,
        year: postData.year || undefined,
      };

      // Handle episodes for TV shows
      if (isTvShow) {
        // Check if episodes array exists and has valid entries
        if (postData.episodes && postData.episodes.length > 0 && postData.episodes[0] !== null) {
          movieInfo.episodes = postData.episodes.map((ep) => ({
            id: ep.id,
            title: ep.t,
            number: parseInt(ep.ep),
            season: parseInt(ep.s.replace('S', '')),
            description: ep.ep_desc,
            duration: ep.time,
          }));
        } else if (postData.season && postData.season.length > 0) {
          // Fallback: Create episodes based on seasons if episodes array is empty
          movieInfo.episodes = postData.season.flatMap((season) => {
            const episodes = [];
            for (let i = 1; i <= parseInt(season.ep); i++) {
              episodes.push({
                id: season.id,
                title: `Season ${season.s} Episode ${i}`,
                number: i,
                season: parseInt(season.s),
              });
            }
            return episodes;
          });
        } else {
          // Fallback: Single episode for the entire show
          movieInfo.episodes = [
            {
              id: mediaId,
              title: 'Full Content',
            },
          ];
        }
      } else {
        // Handle movies
        movieInfo.episodes = [
          {
            id: mediaId,
            title: postData.title || 'Full Movie',
          },
        ];
      }

      return movieInfo;
    } catch (err) {
      throw new Error(`NetMirror fetchMediaInfo failed: ${(err as Error).message}`);
    }
  };

  const fetchEpisodeServers = async (episodeId: string, mediaId?: string): Promise<IEpisodeServer[]> => {
    return [
      {
        name: 'NetMirror',
        url: `${config.baseUrl}/playlist.php?id=${episodeId}`,
      },
    ];
  };

  const fetchEpisodeSources = async (episodeId: string, mediaId?: string): Promise<ISource> => {
    try {
      const { data } = await axios.get<NetMirrorPlaylist[]>(
        `${config.baseUrl}/playlist.php?id=${episodeId}&t=Video&tm=${Date.now()}`,
        {
          headers: {
            ...headers,
            Cookie: await getCookies(),
          },
        }
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No playlist data received');
      }

      const playlist = data[0];

      if (!playlist?.sources || !Array.isArray(playlist.sources)) {
        throw new Error('No sources in playlist');
      }

      const sources = playlist.sources.map((s) => {
        let quality = '480p';
        if (s.label === 'Full HD') quality = '1080p';
        else if (s.label === 'Mid HD') quality = '720p';
        else if (s.label === 'Low HD') quality = '480p';

        return {
          url: `${config.baseUrl}${s.file}`,
          quality,
          isM3U8: true,
        };
      });

      const subtitles = playlist.tracks
        ?.filter((t) => t.kind === 'captions')
        .map((t) => ({
          url: t.file.startsWith('//') ? `https:${t.file}` : t.file,
          lang: t.label || t.language || 'Unknown',
        }));

      return {
        headers: { Referer: `${config.baseUrl}/` },
        sources,
        subtitles,
      };
    } catch (err) {
      throw new Error(`NetMirror fetchEpisodeSources failed: ${(err as Error).message}`);
    }
  };

  const fetchHlsPlaylist = async (episodeId: string): Promise<string> => {
    try {
      const { data } = await axios.get<string>(`${config.baseUrl}/hls/${episodeId}`, {
        headers: {
          ...headers,
          Cookie: await getCookies(),
        },
      });
      return data;
    } catch (err) {
      throw new Error(`NetMirror fetchHlsPlaylist failed: ${(err as Error).message}`);
    }
  };

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
    fetchHlsPlaylist,
  };
}
