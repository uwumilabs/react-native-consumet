import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type SubOrDub,
  type ProviderContext,
  type ProviderConfig,
  type IAnimeEpisode,
  type MediaFormat,
} from '../../../models';
import { toMediaStatus } from '../../common/media-status';
import { pickServer, serverName } from '../../common/servers';
import { webViewJson } from '../helpers';

export function createReanime(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, enums, createCustomBaseUrl, extractors, NativeConsumet, PolyURL, USER_AGENT } = ctx;
  const { makeGetRequestWithWebView } = NativeConsumet;
  const { SubOrDub: SubOrDubEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://reanime.to', customBaseURL);
  const apiBase = `${baseUrl}/api/v1`;

  const config: ProviderConfig = {
    name: 'ReAnime',
    languages: 'en',
    classPath: 'ANIME.ReAnime',
    logo: 'https://reanime.to/favicon-32x32.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  const hdrs = (referer?: string): Record<string, string> => ({
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Referer': referer ?? `${baseUrl}/`,
  });

  const pickTitle = (t: any): string => t?.english || t?.romaji || t?.native || '';
  const pickCover = (c: any): string => c?.extra_large || c?.large || c?.medium || '';

  // WebView requests send no User-Agent: the WebView keeps its own (see makeGetRequestWithWebView).
  const watchPageHtml = async (animeId: string, epNumber: number, lang: string): Promise<string> => {
    const url = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
    const res = await makeGetRequestWithWebView(url, { Referer: `${baseUrl}/` });
    return res.html ?? '';
  };

  /** The episode's servers from the watch API; none when it doesn't answer with them. */
  const fetchEpisodeLinks = async (
    animeId: string,
    epNumber: number
  ): Promise<Array<{ serverName: string; dataLink: string }>> => {
    const tz = encodeURIComponent('America/New_York');
    const apiUrl = `${apiBase}/watch/${animeId}?ep=${epNumber}&tz=${tz}`;
    const res = await makeGetRequestWithWebView(apiUrl, {
      Accept: 'application/json',
      Referer: `${baseUrl}/watch/${animeId}?ep=${epNumber}`,
    });
    try {
      const parsed = webViewJson(res.html, apiUrl);
      return Array.isArray(parsed.episode_links) ? parsed.episode_links : [];
    } catch {
      // No JSON: the servers are read from the watch page instead.
      return [];
    }
  };

  const parseServersWithUrls = (html: string, subOrDub: SubOrDub): IEpisodeServer[] => {
    const $ = load(html);
    const seen = new Set<string>();
    const servers: IEpisodeServer[] = [];
    const targetLabel = subOrDub === SubOrDubEnum.DUB ? 'DUB:' : 'SUB:';

    // cheerio decodes the iframe's src (HTML entities to characters)
    const iframeSrc = $('#video-player').attr('src') ?? '';

    $('span').each((_i, spanEl) => {
      if ($(spanEl).text().trim() === targetLabel) {
        $(spanEl)
          .parent()
          .find('button.server-btn-enhanced')
          .each((_, btn) => {
            const name = $(btn).text().trim();
            if (!name || seen.has(name)) return;
            seen.add(name);
            // Only the active server ("bg-primary") has its URL on the page, in the iframe.
            const url = $(btn).hasClass('bg-primary') ? iframeSrc : '';
            servers.push({ name: serverName('flixcloud', name), url });
          });
      }
    });

    return servers;
  };

  const search = async (query: string, page: number = 1, limit: number = 20): Promise<ISearch<IAnimeResult>> => {
    const offset = (page - 1) * limit;
    const { data } = await axios.get(`${apiBase}/search`, {
      params: { q: query, limit, offset },
      headers: hdrs(),
    });

    const total: number = data.total ?? 0;
    const results: IAnimeResult[] = (data.results ?? []).map(
      (item: any): IAnimeResult => ({
        id: item.anime_id,
        title: pickTitle(item.title),
        url: `${baseUrl}/anime/${item.anime_id}`,
        image: pickCover(item.cover_image),
        type: item.format as MediaFormat,
        status: toMediaStatus(item.status),
        genres: item.genres ?? [],
        sub: item.subbed ?? 0,
        dub: item.dubbed ?? 0,
      })
    );

    return {
      currentPage: page,
      hasNextPage: offset + limit < total,
      totalResults: total,
      results,
    };
  };

  const fetchEpisodes = async (animeId: string): Promise<IAnimeEpisode[]> => {
    const episodes: IAnimeEpisode[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const { data } = await axios.get(`${apiBase}/anime/${animeId}/episodes`, {
        params: { page, limit },
        headers: hdrs(`${baseUrl}/anime/${animeId}`),
      });

      const batch: any[] = data.data ?? [];
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
          url: `${baseUrl}/watch/${animeId}?ep=${ep.episode_number}`,
        });
      }

      if (batch.length < limit) break;
      page++;
    }

    return episodes;
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const { data: anime } = await axios.get(`${apiBase}/anime/${id}`, {
      headers: hdrs(`${baseUrl}/anime/${id}`),
    });

    const info: IAnimeInfo = {
      id: anime.anime_id ?? id,
      title: pickTitle(anime.title),
      url: `${baseUrl}/anime/${id}`,
      image: pickCover(anime.cover_image),
      cover: anime.banner_image || undefined,
      description: anime.description?.replace(/<[^>]*>/g, '').trim(),
      status: toMediaStatus(anime.status),
      type: anime.format as MediaFormat,
      releaseDate: anime.season_year ? String(anime.season_year) : undefined,
      genres: anime.genres ?? [],
      studios: (anime.studios ?? []).filter((s: any) => s.is_main).map((s: any) => s.name),
      totalEpisodes: anime.episodes || anime.subbed || 0,
      sub: anime.subbed ?? 0,
      dub: anime.dubbed ?? 0,
      hasSub: (anime.subbed ?? 0) > 0,
      hasDub: (anime.dubbed ?? 0) > 0,
    };

    info.episodes = await fetchEpisodes(id);

    return info;
  };

  /** @param episodeId `<anime id>/<episode number>` */
  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    const parts = episodeId.split('/');
    const animeId = parts[0]!;
    const epNumber = Number(parts[1]!);
    const isDub = subOrDub === SubOrDubEnum.DUB;

    const episodeLinks = await fetchEpisodeLinks(animeId, epNumber);
    if (episodeLinks.length > 0) {
      return episodeLinks
        .filter((l) => l.serverName && l.dataLink)
        .map((l) => ({
          name: serverName('flixcloud', l.serverName),
          // The site asks FlixCloud for the dub with &a=1.
          url: isDub ? `${l.dataLink}&a=1` : l.dataLink,
        }));
    }

    const html = await watchPageHtml(animeId, epNumber, isDub ? 'dub' : 'sub');
    const servers = parseServersWithUrls(html, subOrDub);

    if (!servers.length) throw new Error('[ReAnime] No servers found — user may not be logged in');
    return servers;
  };

  /**
   * @param episodeId `<anime id>/<episode number>`
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    server?: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    const [animeId, epNumber] = episodeId.split('/');
    const lang = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
    const watchUrl = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;

    const picked = pickServer(await fetchEpisodeServers(episodeId, subOrDub), server);
    if (!picked.url) throw new Error(`[ReAnime] No embed URL for server "${picked.name}" — user may not be logged in`);

    return extractors.FlixCloud(ctx).extract(new PolyURL(picked.url), watchUrl);
  };

  return {
    ...config,
    search,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
  };
}

export type ReAnimeProviderInstance = ReturnType<typeof createReanime>;
