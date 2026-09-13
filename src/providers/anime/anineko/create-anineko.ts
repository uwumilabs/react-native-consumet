import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type StreamingServers,
  type MediaFormat,
  type SubOrDub,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

function createAniNeko(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, enums, createCustomBaseUrl, USER_AGENT, PolyURL, extractors } = ctx;
  const { VidHide } = extractors;
  const { MediaStatus: MediaStatusEnum, SubOrDub: SubOrDubEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://anineko.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'AniNeko',
    languages: 'en',
    classPath: 'ANIME.AniNeko',
    logo: 'https://anineko.to/favicon.ico',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  const UA =
    USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  const hdrs = (referer?: string): Record<string, string> => ({
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': referer ?? `${baseUrl}/`,
  });

  // ── Card scraping ──────────────────────────────────────────────────────────

  const scrapeCards = (html: string): IAnimeResult[] => {
    const $ = load(html);
    const results: IAnimeResult[] = [];

    // Cards: article.nv-anime-card  (browse page layout from Kotlin extension)
    $('article.nv-anime-card').each((_, el) => {
      const card = $(el);
      const anchor = card.find('a').first();
      const href = anchor.attr('href') ?? '';
      // href = /watch/{slug}  →  id = {slug}
      const id = href.replace(/^\/watch\//, '').replace(/\/$/, '');
      if (!id) return;

      const title = card.find('h3.nv-anime-title a').text().trim() || card.find('img').attr('alt')?.trim() || '';

      const image = card.find('img').attr('src') || card.find('img').attr('data-src') || undefined;

      // Badge: "TV", "Movie", "OVA" etc.
      const type = card.find('.nv-anime-badge, .badge').first().text().trim() as MediaFormat;

      results.push({
        id,
        title,
        url: `${baseUrl}/watch/${id}`,
        image,
        type: type || undefined,
      });
    });

    return results;
  };

  const parsePagination = (html: string, page: number) => {
    const $ = load(html);
    // Common pagination pattern — adapt selectors if the site uses different markup
    const totalText = $('[class*="result"], [class*="total"]').first().text();
    const totalMatch = totalText.match(/(\d[\d,]*)/);
    const total = totalMatch ? parseInt(totalMatch[1]!.replace(',', ''), 10) : 0;

    const hasNextPage = $('a[rel="next"], .pagination .next:not(.disabled) a').length > 0;

    return { total, hasNextPage };
  };

  const fetchBrowsePage = async (
    params: Record<string, string | number>,
    page: number = 1
  ): Promise<ISearch<IAnimeResult>> => {
    const qs = new URLSearchParams({
      page: String(page),
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const url = `${baseUrl}/browse?${qs}`;
    const { data: html } = await axios.get<string>(url, { headers: hdrs() });
    const { total, hasNextPage } = parsePagination(html, page);
    return {
      currentPage: page,
      hasNextPage,
      totalResults: total,
      results: scrapeCards(html),
    };
  };

  // ── Public browse / search ─────────────────────────────────────────────────

  // ── Filter constants (from Filters.kt) ────────────────────────────────────

  /** All valid genre values for genre[] param */
  const GENRES = [
    'Action',
    'Adventure',
    'Cars',
    'Comedy',
    'Dementia',
    'Demons',
    'Drama',
    'Ecchi',
    'Fantasy',
    'Game',
    'Harem',
    'Historical',
    'Horror',
    'Isekai',
    'Josei',
    'Kids',
    'Magic',
    'Mahou Shoujo',
    'Martial Arts',
    'Mecha',
    'Military',
    'Music',
    'Mystery',
    'Parody',
    'Police',
    'Psychological',
    'Romance',
    'Samurai',
    'School',
    'Sci-Fi',
    'Seinen',
    'Shoujo',
    'Shoujo Ai',
    'Shounen',
    'Shounen Ai',
    'Slice of Life',
    'Space',
    'Sports',
    'Super Power',
    'Supernatural',
    'Thriller',
    'Vampire',
  ] as const;

  /** type[] param values: TV=1, Movie=2, OVA=3, ONA=4, Special=5, Music=6, TV_SHORT=7 */
  const TYPES = { TV: '1', Movie: '2', OVA: '3', ONA: '4', Special: '5', Music: '6', TV_SHORT: '7' } as const;

  /** status[] param values */
  const STATUS = { Ongoing: 'Ongoing', Completed: 'Completed', Upcoming: 'Upcoming' } as const;

  /** language[] param values (maps to "version") */
  const LANGUAGE = { Subbed: 'Subbed', Dubbed: 'Dubbed' } as const;

  /** sort param values */
  const SORT = {
    LatestUpdate: 'recently_updated',
    ReleaseDate: 'release_date',
    RecentlyAdded: 'recently_added',
    TitleAZ: 'title_az',
  } as const;

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return fetchBrowsePage({ keyword: query, sort: SORT.LatestUpdate }, page);
  };

  const fetchRecentlyUpdated = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return fetchBrowsePage({ sort: SORT.LatestUpdate }, page);
  };

  const fetchNewReleases = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return fetchBrowsePage({ sort: SORT.ReleaseDate }, page);
  };

  const fetchRecentlyAdded = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return fetchBrowsePage({ sort: SORT.RecentlyAdded }, page);
  };

  /**
   * Browse by genre — genre must be one of the GENRES constants.
   * Additional filters (type, status, language, year) can be passed as extra params.
   */
  const genreSearch = async (
    genre: string,
    page: number = 1,
    extra?: { type?: string; status?: string; language?: string; year?: string | number }
  ): Promise<ISearch<IAnimeResult>> => {
    const params = new URLSearchParams({
      page: String(page),
      sort: SORT.LatestUpdate,
    });
    params.append('genre[]', genre);
    if (extra?.type) params.append('type[]', extra.type);
    if (extra?.status) params.append('status[]', extra.status);
    if (extra?.language) params.append('language[]', extra.language);
    if (extra?.year) params.append('year[]', String(extra.year));

    const url = `${baseUrl}/browse?${params}`;
    const { data: html } = await axios.get<string>(url, { headers: hdrs() });
    const { total, hasNextPage } = parsePagination(html, page);
    return {
      currentPage: page,
      hasNextPage,
      totalResults: total,
      results: scrapeCards(html),
    };
  };

  // ── Anime info ─────────────────────────────────────────────────────────────

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const { data: html } = await axios.get<string>(`${baseUrl}/watch/${id}`, { headers: hdrs() });
    const $ = load(html);

    const info: IAnimeInfo = { id, title: '' };

    // Title — h1 or h2 on the info page
    info.title =
      $('h1.nv-anime-title, h1.anime-title, h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      '';

    info.url = `${baseUrl}/watch/${id}`;
    info.image =
      $('meta[property="og:image"]').attr('content') ||
      $('img.nv-anime-poster, .poster img, img.cover').first().attr('src') ||
      undefined;

    info.description =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('[class*="desc"], [class*="synopsis"], [class*="summary"]').first().text().trim() ||
      undefined;

    // Meta fields — try common selector patterns
    const metaText = (label: string) =>
      $(`[class*="info"] *:contains("${label}")`)
        .filter((_, el) => $(el).text().trim().startsWith(label))
        .first()
        .next()
        .text()
        .trim() || $(`[class*="info"] *:contains("${label}")`).first().text().replace(label, '').trim();

    const statusRaw = metaText('Status');
    switch (statusRaw.toLowerCase()) {
      case 'currently airing':
      case 'ongoing':
      case 'releasing':
        info.status = MediaStatusEnum.ONGOING;
        break;
      case 'finished airing':
      case 'completed':
        info.status = MediaStatusEnum.COMPLETED;
        break;
      case 'not yet aired':
        info.status = MediaStatusEnum.NOT_YET_AIRED;
        break;
      default:
        info.status = MediaStatusEnum.UNKNOWN;
    }

    info.type = (metaText('Type').toUpperCase() as MediaFormat) || undefined;
    info.releaseDate = metaText('Aired') || metaText('Release') || undefined;

    // Genres — links inside genre section
    info.genres = [];
    $('a[href*="/browse"][href*="genre"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g) info.genres?.push(g);
    });

    // SUB / DUB / HSUB detection from episode badges
    let hasSub = false;
    let hasDub = false;
    $('article.nv-info-episode-item, .episode-item').each((_, el) => {
      const badges = $(el).text().toLowerCase();
      if (badges.includes('sub') || badges.includes('hsub')) hasSub = true;
      if (badges.includes('dub')) hasDub = true;
    });
    info.hasSub = hasSub;
    info.hasDub = hasDub;

    // Episodes
    info.episodes = [];
    $('div.nv-info-episode-grid article.nv-info-episode-item, .episode-item').each((_, el) => {
      const item = $(el);

      // Links: watch href = /watch/{slug}/ep-{n}, download href = /download/{slug}/ep-{n}
      const watchHref = item.find('a[href*="/watch/"]').attr('href') || item.find('a').first().attr('href') || '';

      if (!watchHref) return;

      // Extract episode number from the URL  /watch/one-piece/ep-1 → 1
      const epNumMatch = watchHref.match(/\/ep-(\d+(?:\.\d+)?)/);
      const number = epNumMatch ? parseFloat(epNumMatch[1]!) : 0;

      // ID = `{slug}/ep-{number}` — strip leading /watch/
      const epId = watchHref.replace(/^\/watch\//, '');

      const badgeText = item.text().toLowerCase();
      const isSubbed = badgeText.includes('sub') || badgeText.includes('hsub');
      const isDubbed = badgeText.includes('dub');

      const titleEl = item.find('[class*="title"], span').first();
      const title = titleEl.text().trim() || `Episode ${number}`;

      info.episodes?.push({
        id: epId,
        number,
        title,
        isSubbed,
        isDubbed,
        url: `${baseUrl}${watchHref}`,
      });
    });

    info.totalEpisodes = info.episodes.length;

    return info;
  };

  // ── Servers ────────────────────────────────────────────────────────────────

  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    // episodeId = "{slug}/ep-{n}"  or  a full URL (passthrough)
    const url = episodeId.startsWith('http') ? episodeId : `${baseUrl}/watch/${episodeId}`;
    const { data: html } = await axios.get<string>(url, { headers: hdrs(`${baseUrl}/`) });
    const $ = load(html);

    const servers: IEpisodeServer[] = [];
    const seen = new Set<string>();

    // Actual DOM structure:
    //   <div class="nv-server-grid lang-group" data-id="hsub|sub|dub">
    //     <button class="nv-server-btn server-video server" data-video="<url>" data-tab="hsub|sub|dub">
    //       HD-2 <span>Hard Sub</span>
    //     </button>
    //   </div>
    //
    // SUB → include panels: hsub (Hard Sub) + sub (Soft Sub)
    // DUB → include only panel: dub
    const panelIds = subOrDub === SubOrDubEnum.DUB ? ['dub'] : ['hsub', 'sub'];

    for (const panelId of panelIds) {
      $(`div.lang-group[data-id="${panelId}"] button.server-video[data-video]`).each((_, btn) => {
        const embedUrl = $(btn).attr('data-video')?.trim();
        if (!embedUrl) return;

        // Server name: button text excluding child <span>
        const serverName = $(btn)
          .clone()
          .children('span')
          .remove()
          .end()
          .text()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-');

        // Sub-type: from <span> inside button
        const spanText = $(btn).find('span').text().trim().toLowerCase();
        const subType = spanText.includes('hard') ? 'hardsub' : spanText.includes('dub') ? 'dub' : 'softsub';

        const name = `${serverName}-${subType}`;
        if (seen.has(name)) return;
        seen.add(name);

        servers.push({ name, url: embedUrl });
      });
    }

    return servers;
  };

  // ── Sources ────────────────────────────────────────────────────────────────

  /**
   * Pick the right extractor based on the embed URL domain.
   *
   * Known mappings (from Kotlin extension):
   *   vivibebe.site / vibevibe.workers.dev / bibiemb.xyz  → inline M3U8 regex
   *   otakuhg.site / otakuvid.online                       → VidHide
   *   playmogo.com / dood.*                                → StreamTape (closest available)
   *   fallback                                              → VidHide
   */
  const extractFromUrl = async (embedUrl: string, pageUrl: string): Promise<ISource> => {
    const domain = new PolyURL(embedUrl).hostname.toLowerCase();

    // Vivibebe / vibevibe / bibiemb — direct M3U8 via regex
    if (domain.includes('vivibebe') || domain.includes('vibevibe') || domain.includes('bibiemb')) {
      const { data: pageHtml } = await axios.get<string>(embedUrl, {
        headers: { 'User-Agent': UA, 'Referer': pageUrl },
      });
      const m3u8Match = pageHtml.match(/const\s+src\s*=\s*"([^"]+\.m3u8[^"]*)"/);
      if (!m3u8Match?.[1]) throw new Error(`[AniNeko] Could not find M3U8 in ${domain}`);
      // Extract subtitles from URL params (sub, caption_1, c1_file, sub_1)
      const subUrl =
        new PolyURL(embedUrl).searchParams.get('sub') ||
        new PolyURL(embedUrl).searchParams.get('caption_1') ||
        new PolyURL(embedUrl).searchParams.get('c1_file') ||
        null;
      const subLabel =
        new PolyURL(embedUrl).searchParams.get('c1_label') ||
        new PolyURL(embedUrl).searchParams.get('sub_1') ||
        'English';
      return {
        sources: [{ url: m3u8Match[1], isM3U8: true, quality: 'auto' }],
        subtitles: subUrl ? [{ url: subUrl, lang: subLabel }] : [],
        headers: { Referer: `https://${domain}/` },
      };
    }

    // Doodstream / playmogo — extract direct mp4 link via regex (no context extractor available)
    if (domain.includes('dood') || domain.includes('playmogo')) {
      const { data: doodHtml } = await axios.get<string>(embedUrl, {
        headers: { 'User-Agent': UA, 'Referer': pageUrl },
      });
      const mp4 =
        doodHtml.match(/source\s+src="([^"]+\.mp4[^"]*)"/)?.[1] || doodHtml.match(/file:\s*["']([^"']+)["']/)?.[1];
      if (!mp4) throw new Error(`[AniNeko] Could not extract source from ${domain}`);
      return { sources: [{ url: mp4, isM3U8: false, quality: 'auto' }], subtitles: [] };
    }

    // OtakuHG / OtakuVid / default — VidHide
    return VidHide(ctx).extract(new PolyURL(embedUrl), pageUrl);
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    // Direct embed URL passthrough
    if (episodeId.startsWith('http')) {
      return extractFromUrl(episodeId, baseUrl);
    }

    const watchUrl = `${baseUrl}/watch/${episodeId}`;
    const servers = await fetchEpisodeServers(episodeId, subOrDub);

    if (servers.length === 0) {
      throw new Error(`[AniNeko] No servers found for episode ${episodeId}`);
    }

    // Server selection: match by server enum value (e.g. 'vidhide' matches 'hd-1-hardsub' via host name)
    // Prefer server param match, fall back to first available
    const serverLower = server?.toLowerCase() ?? '';
    const picked = servers.find((s) => s.name.includes(serverLower)) ?? servers[0]!;

    if (!picked.url) throw new Error(`[AniNeko] No embed URL for server "${picked.name}"`);
    return extractFromUrl(picked.url, watchUrl);
  };

  return {
    ...config,
    // filter constants — consumers can use these for UI filter pickers
    GENRES,
    TYPES,
    STATUS,
    LANGUAGE,
    SORT,
    // methods
    search,
    fetchRecentlyUpdated,
    fetchNewReleases,
    fetchRecentlyAdded,
    genreSearch,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
  };
}

export type AniNekoProviderInstance = ReturnType<typeof createAniNeko>;
export default createAniNeko;
