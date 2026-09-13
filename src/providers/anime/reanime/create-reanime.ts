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
  StreamingServers,
} from '../../../models';
import { PolyURL } from '../../../utils/url-polyfill';

function createReanime(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, enums, createCustomBaseUrl, extractors, NativeConsumet } = ctx;
  const { makeGetRequestWithWebView } = NativeConsumet;
  const { MediaStatus: MediaStatusEnum, SubOrDub: SubOrDubEnum } = enums;

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

  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  const extractorCtx = {
    axios,
    load,
    CryptoJS: ctx.CryptoJS,
    USER_AGENT: UA,
    PolyURL: ctx.PolyURL,
    PolyURLSearchParams: ctx.PolyURLSearchParams,
    NativeConsumet: ctx.NativeConsumet,
  };

  const hdrs = (referer?: string): Record<string, string> => ({
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': referer ?? `${baseUrl}/`,
  });

  const toMediaStatus = (s: string) => {
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

  const pickTitle = (t: any): string => t?.english || t?.romaji || t?.native || '';
  const pickCover = (c: any): string => c?.extra_large || c?.large || c?.medium || '';

  const watchPageHtml = async (animeId: string, epNumber: number, lang: string): Promise<string> => {
    const url = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;
    const res = await makeGetRequestWithWebView(url, { 'User-Agent': UA, 'Referer': `${baseUrl}/` });
    return res.html ?? '';
  };

  const fetchEpisodeLinks = async (
    animeId: string,
    epNumber: number
  ): Promise<Array<{ serverName: string; dataLink: string }>> => {
    const tz = encodeURIComponent('America/New_York');
    const apiUrl = `${apiBase}/watch/${animeId}?ep=${epNumber}&tz=${tz}`;
    const res = await makeGetRequestWithWebView(apiUrl, {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Referer': `${baseUrl}/watch/${animeId}?ep=${epNumber}`,
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

  const parseServersWithUrls = (html: string, subOrDub: SubOrDub): IEpisodeServer[] => {
    const $ = load(html);
    const seen = new Set<string>();
    const servers: IEpisodeServer[] = [];
    const targetLabel = subOrDub === SubOrDubEnum.DUB ? 'DUB:' : 'SUB:';

    // iframe src is decoded by cheerio (html entities → chars)
    const iframeSrc = $('#video-player').attr('src') ?? '';

    $('span').each((_, spanEl) => {
      if ($(spanEl).text().trim() === targetLabel) {
        $(spanEl)
          .parent()
          .find('button.server-btn-enhanced')
          .each((_, btn) => {
            const name = $(btn).text().trim();
            if (!name || seen.has(name)) return;
            seen.add(name);
            // Active server has "bg-primary" class; its URL is already in the iframe
            const url = $(btn).hasClass('bg-primary') ? iframeSrc : '';
            // Normalise to "flixcloud-hd-2" / "flixcloud-hd-1" so server selection works
            servers.push({ name: `flixcloud-${name.toLowerCase().replace(/\s+/g, '-')}`, url });
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
          // e.g. "HD-2" → "flixcloud-hd-2", "HD-1" → "flixcloud-hd-1"
          name: `flixcloud-${l.serverName.toLowerCase().replace(/\s+/g, '-')}`,
          // Site appends &a=1 to the FlixCloud URL for dub
          url: isDub ? `${l.dataLink}&a=1` : l.dataLink,
        }));
    }

    const lang = isDub ? 'dub' : 'sub';
    const html = await watchPageHtml(animeId, epNumber, lang);
    const servers = parseServersWithUrls(html, subOrDub);

    if (!servers.length) throw new Error('[ReAnime] No servers found — user may not be logged in');
    return servers;
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServers.FlixCloud,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    const parts = episodeId.split('/');
    const animeId = parts[0]!;
    const epNumber = parts[1]!;
    const lang = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
    const watchUrl = `${baseUrl}/watch/${animeId}?ep=${epNumber}&lang=${lang}`;

    const servers = await fetchEpisodeServers(episodeId, subOrDub);
    const idx = servers.findIndex((s) => s.name.includes(server.toLowerCase()));
    if (idx === -1) {
      throw new Error(`[ReAnime] Server "${server}" not found. Available: ${servers.map((s) => s.name).join(', ')}`);
    }

    const picked = servers[idx]!;
    if (!picked.url) throw new Error(`[ReAnime] No embed URL for server "${picked.name}" — user may not be logged in`);

    return extractors.FlixCloud(extractorCtx).extract(new PolyURL(picked.url), watchUrl);
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
export default createReanime;
