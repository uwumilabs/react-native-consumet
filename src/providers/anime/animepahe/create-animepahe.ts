import {
  type SubOrDub,
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type StreamingServers,
  type MediaFormat,
  type ProviderContext,
  type ProviderConfig,
  type MediaStatus,
  type IAnimeEpisode,
} from '../../../models';

export function createAnimePahe(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL, NativeConsumet } = ctx;
  const { Kwik } = extractors;
  const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;
  const { getDdosGuardCookiesWithWebView } = NativeConsumet;
  // Provider configuration - use the standardized base URL creation
  const baseUrl = createCustomBaseUrl('https://animepahe.ru', customBaseURL);

  const config: ProviderConfig = {
    name: 'Zoro',
    languages: 'en',
    classPath: 'ANIME.Zoro',
    logo: 'https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/7e/91/00/7e9100ee-2b62-0942-4cdc-e9b93252ce1c/source/512x512bb.jpg',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };
  let ddgCookie:
    | {
        cookie: string;
      }
    | null
    | string = null;
  const initDdgCookie = async (): Promise<void> => {
    try {
      try {
        ddgCookie = await getDdosGuardCookiesWithWebView(config.baseUrl);
        // console.log('DDoS-Guard cookie obtained (WebView):', ddgCookie);
      } catch (err) {
        console.error('Failed to bypass DDoS-Guard with WebView:', err);
      }
    } catch (error) {
      console.error('Failed to initialize DDoS-Guard cookie:', error);
    }
  };

  function Headers(sessionId: string | false) {
    const headers: Record<string, string> = {
      'authority': 'animepahe.ru',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      'Referer': sessionId ? `${config.baseUrl}/anime/${sessionId}` : `${config.baseUrl}`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    };

    if (ddgCookie) {
      headers.Cookie = typeof ddgCookie === 'object' && ddgCookie !== null ? ddgCookie.cookie : ddgCookie || '';
    }

    return headers;
  }

  const fetchEpisodes = async (session: string, page: number): Promise<IAnimeEpisode[]> => {
    const res = await axios.get(`${config.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, {
      headers: Headers(session),
    });
    const epData = res.data.data;

    return [
      ...epData.map(
        (item: any): IAnimeEpisode => ({
          id: `${session}/${item.session}`,
          number: item.episode,
          title: item.title,
          image: item.snapshot,
          duration: item.duration,
          isSubbed: item.audio === 'jpn' || item.audio === 'eng',
          isDubbed: item.audio === 'eng',
          releaseDate: item.created_at,
          url: `${config.baseUrl}/play/${session}/${item.session}`,
        })
      ),
    ] as IAnimeEpisode[];
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      if (!ddgCookie) {
        await initDdgCookie();
      }
      const { data } = await axios.get(`${config.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
        headers: Headers(false),
      });

      const res = {
        results: data.data.map((item: any) => ({
          id: item.session,
          title: item.title,
          image: item.poster,
          rating: item.score,
          releaseDate: item.year,
          type: item.type,
        })),
      };

      return res;
    } catch (err) {
      //console.log(err);
      throw new Error((err as Error).message);
    }
  };

  const fetchAnimeInfo = async (id: string, episodePage: number = -1): Promise<IAnimeInfo> => {
    const animeInfo: IAnimeInfo = {
      id: id,
      title: '',
    };
    try {
      if (!ddgCookie) {
        await initDdgCookie();
      }
      const res = await fetch(`${config.baseUrl}/anime/${id}`, {
        headers: Headers(id),
      });
      const data = await res.text();
      const $ = load(data);

      animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
      animeInfo.image = $('div.anime-poster a').attr('href');
      animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
      animeInfo.description = $('div.anime-summary').text().trim();
      animeInfo.genres = $('div.anime-genre ul li')
        .map((i, el) => $(el).find('a').attr('title'))
        .get();
      animeInfo.hasSub = true;

      switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
        case 'Currently Airing':
          animeInfo.status = MediaStatusEnum.ONGOING;
          break;
        case 'Finished Airing':
          animeInfo.status = MediaStatusEnum.COMPLETED;
          break;
        default:
          animeInfo.status = MediaStatusEnum.UNKNOWN;
      }
      animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase() as MediaFormat;
      animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
        .text()
        .split('to')[0]!
        .replace('Aired:', '')
        .trim();
      animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
      animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));
      animeInfo.recommendations = [];
      $('div.anime-recommendation .col-sm-6').each((i, el) => {
        animeInfo.recommendations?.push({
          id: $(el).find('.col-2 > a').attr('href')?.split('/')[2]!,
          title: $(el).find('.col-2 > a').attr('title')!,
          image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
          url: `${config.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
          releaseDate: $(el).find('div.col-9 > a').text().trim(),
          status: $(el).find('div.col-9 > strong').text().trim() as MediaStatus,
        });
      });

      animeInfo.relations = [];
      $('div.anime-relation .col-sm-6').each((i, el) => {
        animeInfo.relations?.push({
          id: $(el).find('.col-2 > a').attr('href')?.split('/')[2]!,
          title: $(el).find('.col-2 > a').attr('title')!,
          image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
          url: `${config.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
          releaseDate: $(el).find('div.col-9 > a').text().trim(),
          status: $(el).find('div.col-9 > strong').text().trim() as MediaStatus,
          relationType: $(el).find('h4 > span').text().trim(),
        });
      });

      animeInfo.episodes = [];
      if (episodePage < 0) {
        const {
          data: { last_page, data },
        } = await axios.get(`${config.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
          headers: Headers(id),
        });

        animeInfo.episodePages = last_page;

        animeInfo.episodes.push(
          ...data.map(
            (item: any) =>
              ({
                id: `${id}/${item.session}`,
                number: item.episode,
                title: item.title,
                image: item.snapshot,
                duration: item.duration,
                isSubbed: item.audio === 'jpn' || item.audio === 'eng',
                isDubbed: item.audio === 'eng',
                releaseDate: item.created_at,
                url: `${config.baseUrl}/play/${id}/${item.session}`,
              }) as IAnimeEpisode
          )
        );

        for (let i = 1; i < last_page; i++) {
          animeInfo.episodes.push(...(await fetchEpisodes(id, i + 1)));
        }
      } else {
        animeInfo.episodes.push(...(await fetchEpisodes(id, episodePage)));
      }

      return animeInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServersEnum.Kwik,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.Kwik:
          return {
            headers: { Referer: serverUrl.href },
            ...(await Kwik().extract(serverUrl)),
          };
        default:
          return {
            headers: { Referer: serverUrl.href },
            ...(await Kwik().extract(serverUrl)),
          };
      }
    }
    try {
      if (!ddgCookie) {
        await initDdgCookie();
      }
      const { data } = await axios.get(`${config.baseUrl}/play/${episodeId}`, {
        headers: Headers(episodeId.split('/')[0]!),
      });

      const $ = load(data);

      const downloads = $('div#pickDownload > a')
        .map((i, el) => ({
          url: $(el).attr('href')!,
          quality: $(el).text(),
        }))
        .get();

      const iSource: ISource = {
        headers: {
          Referer: 'https://kwik.si/',
        },
        sources: [],
      };

      iSource.download = downloads;
      const servers = await fetchEpisodeServers(episodeId, subOrDub);
      const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));
      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }

      const serverUrl: URL = new URL(servers[i]!.url);
      return await fetchEpisodeSources(serverUrl.href, server, subOrDub);
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchEpisodeServers = async (episodeId: string, subOrDub: SubOrDub): Promise<IEpisodeServer[]> => {
    try {
      if (!ddgCookie) {
        await initDdgCookie();
      }
      const { data } = await axios.get(`${config.baseUrl}/play/${episodeId}`, {
        headers: Headers(episodeId.split('/')[0]!),
      });

      const $ = load(data);
      const servers: IEpisodeServer[] = [];

      $('div#resolutionMenu > button').each((i, el) => {
        const audio = $(el).attr('data-audio');
        const fansub = $(el).attr('data-fansub');
        const src = $(el).attr('data-src');
        const resolution = $(el).attr('data-resolution');

        if ((subOrDub === SubOrDubEnum.DUB && audio === 'eng') || (subOrDub === SubOrDubEnum.SUB && audio !== 'eng')) {
          servers.push({
            url: src!,
            name: `kwik-${fansub}-${resolution}`,
          });
        }
      });

      return servers;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  // Return the functional provider object
  return {
    // Configuration
    name: config.name,
    get baseUrl() {
      return config.baseUrl;
    },
    set baseUrl(value: string) {
      config.baseUrl = value.startsWith('http') ? value : `http://${value}`;
    },
    logo: config.logo,
    classPath: config.classPath,

    // Core methods, pass only the necessary methods, dont pass helpers or unused methods
    search,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

// Type definition for the provider instance returned by createAnimePahe
export type AnimePaheProviderInstance = ReturnType<typeof createAnimePahe>;

// Default export for backward compatibility
export default createAnimePahe;
