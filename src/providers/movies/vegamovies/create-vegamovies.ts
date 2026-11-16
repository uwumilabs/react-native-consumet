import type { AnyNode, Cheerio, CheerioAPI } from 'cheerio';
import {
  type IMovieInfo,
  type IEpisodeServer,
  type StreamingServers,
  type ISource,
  type IVideo,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
  type ProviderConfig,
  type IMovieEpisode,
} from '../../../models';
import { unwrapFastDlUrl } from '../../../extractors/hubcloud';
import { pageId, pageUrl } from '../site-paths';

const cleanTitle = (raw: string): string => {
  let t = raw;

  // Leading "Download" or "Watch"
  t = t.replace(/^(?:Download|Watch)\s+/i, '');

  // Cut at a season, e.g. " - Season 1", " (Season 1 – 3)", " Season 1", " S01-S03"
  t = t.replace(/\s*[-–—:]?\s*\(?\b(?:Season\s*\d+|S\d{1,2})\b.*$/i, '');

  // Cut at a year in parentheses, e.g. "(2025)"
  t = t.replace(/\s*\(\s*(?:19\d{2}|20\d{2})\s*\).*$/, '');

  // Cut at a trailing "{Hindi-English-Korean}" or "{E110 - Added}"
  t = t.replace(/\s*\{.*?\}$/, '');

  // Cut at a trailing "[S04 E15 Added]" or "[320MB]"
  t = t.replace(/\s*\[.*?\]$/, '');

  // Cut at quality, release, audio and network tags
  t = t.replace(
    /\s*[-–—:]?\s*\b(?:Dual[- ]Audio|Multi[- ]Audio|Hindi[- ](?:Dubbed|ORG)|ORG\s+Dubbed|Blu[- ]?Ray|WEB[- ]?DL|HDRip|HDTC|PreDVDRip|CAMRip|DVDRip|Anime\s+Series|K-DRAMA\s+Series|C-Drama\s+Series|Turkish-Drama\s+Series|Netflix[- ]Series|Disney\+|Hotstar|Amazon\s+Prime|IMAX|Extended|Edition|x264|x265|HEVC|10Bit|480p|720p|1080p|2160p|4k)\b.*$/i,
    ''
  );

  return t
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[-–—:|/]+$/, '')
    .trim();
};

const SERIES_TITLE = /\b(?:season|s\d+|web series|series)\b/i;

// The hosts of the site's download links that this provider can follow, most useful first:
// V-Cloud and HubCloud pages (the HubCloud extractor reads both), nexdrive pages that link to
// them, and FastDL.
const DOWNLOAD_HOSTS = ['vcloud', 'hubcloud', 'nexdrive', 'fastdl'];
const hostRank = (href: string) => DOWNLOAD_HOSTS.findIndex((host) => href.includes(host));

const isFastDl = (url: string) => /fastdl\./i.test(url);

// FastDL links come from the site's nexdrive pages, and FastDL wants a Referer from there.
const NEXDRIVE_URL = 'https://nexdrive.fit/';

const qualityRank = (text: string): number => {
  if (/1080p|2160p|4k/i.test(text)) return 3;
  if (/720p/i.test(text)) return 2;
  if (/480p/i.test(text)) return 1;
  return 0;
};

/** The block a heading's links are in: the next paragraph, or the next element with a link. */
const linkBlockAfter = (heading: Cheerio<AnyNode>): Cheerio<AnyNode> => {
  let block = heading.next();
  while (block.length && !block.is('p') && !block.find('a[href]').length) block = block.next();
  return block;
};

/** A block's download link: its link to the most useful download host, else its download button's. */
const downloadLink = ($: CheerioAPI, block: Cheerio<AnyNode>): string | undefined => {
  const hosted = block
    .find('a[href]')
    .toArray()
    .map((a) => $(a).attr('href')!)
    .filter((href) => hostRank(href) >= 0)
    .reduce<string | undefined>((best, href) => (!best || hostRank(href) < hostRank(best) ? href : best), undefined);
  if (hosted) return hosted;
  const button = block.find('.dwd-button, .btn-outline').first();
  return (button.is('a') ? button : button.parent('a')).attr('href');
};

/**
 * VegaMovies (vegamovies.lease), a download site: an "episode" is a download link (a V-Cloud,
 * HubCloud, nexdrive or FastDL page), and each server a host that file can be fetched from.
 * @param customBaseURL site URL to use instead of the default
 */
export function createVegaMovies(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL, USER_AGENT } = ctx;
  const { HubCloud } = extractors;
  const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://vegamovies.lease', customBaseURL);

  const config: ProviderConfig = {
    name: 'VegaMovies',
    languages: 'all',
    classPath: 'MOVIES.VegaMovies',
    logo: `${baseUrl}/images/favicon-32x32.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const defaultHeaders: Record<string, string> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': 'xla=s4t',
    'User-Agent': USER_AGENT,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  /** GETs a page of the site or its link hosts the way a browser coming from `referer` would. */
  const request = (url: string, referer: string = baseUrl) =>
    // Without withCredentials: false, React Native's Android networking replaces the Cookie header
    // (the xla=s4t the site wants) with its own cookie jar's.
    axios.get(url, { headers: { ...defaultHeaders, Referer: referer }, withCredentials: false });

  const extractYear = (text: string): string | undefined => /\b(19\d{2}|20\d{2})\b/.exec(text)?.[1];

  const extractSeasonNumber = (text: string): number => {
    const match = text.match(/season\s*(\d+)|s(\d+)/i);
    const num = match?.[1] || match?.[2];
    return num ? parseInt(num, 10) : 1;
  };

  /** Number of seasons a post covers, from text like "Season 1-5", "Season 1 – 2" or "Season 3". */
  const countSeasons = (text: string): number | undefined => {
    const range = /seasons?\s*(\d+)\s*(?:-|–|—|to|&)\s*(\d+)/i.exec(text);
    if (range) return Math.abs(parseInt(range[2]!, 10) - parseInt(range[1]!, 10)) + 1;
    return /season\s*\d+/i.test(text) ? 1 : undefined;
  };

  /**
   * Search result metadata used by meta providers (TMDB) to match a title: a series post's
   * year is usually that season's year, so only movies get a releaseDate.
   */
  const resultMeta = (rawTitle: string, slug: string, isSeries: boolean) => ({
    type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
    releaseDate: isSeries ? undefined : extractYear(rawTitle),
    seasons: isSeries ? (countSeasons(rawTitle) ?? countSeasons(slug.replace(/-(\d+)-(\d+)/, ' $1-$2'))) : undefined,
  });

  const parseHtmlGrid = ($: CheerioAPI): IMovieResult[] => {
    const results: IMovieResult[] = [];
    const seen = new Set<string>();

    const items = $('.movies-grid, #moviesGridMain, .blog-items, .post-list, #archive-container').children(
      'a, article, .entry-list-item, .poster-card'
    );

    items.each((_, el) => {
      const element = $(el);
      const linkEl = element.is('a') ? element : element.find('a').first();
      const href = linkEl.attr('href') || element.attr('href') || '';
      if (!href || href === '#' || href === '/') return;

      const id = pageId(href, baseUrl);
      if (!id || seen.has(id)) return;
      seen.add(id);

      const rawTitle =
        element.find('.poster-title, .entry-title, .post-title').text().trim() ||
        element.find('img').attr('alt') ||
        linkEl.attr('aria-label') ||
        linkEl.attr('title') ||
        '';

      const isSeries = SERIES_TITLE.test(rawTitle) || href.includes('season') || href.includes('series');

      const title = cleanTitle(rawTitle);
      if (!title) return;

      let image =
        element.find('img').attr('data-lazy-src') ||
        element.find('img').attr('data-src') ||
        element.find('img').attr('src') ||
        '';
      if (image.startsWith('//')) {
        image = `https:${image}`;
      }

      results.push({
        id,
        title,
        url: new PolyURL(href, `${baseUrl}/`).href,
        image,
        ...resultMeta(rawTitle, id, isSeries),
      });
    });

    return results;
  };

  /** A listing of the site's WordPress pages: `path` (none for the home page) at `page`, plus `query`. */
  const fetchListing = async (path: string, page: number, query = ''): Promise<ISearch<IMovieResult>> => {
    const { data } = await request(`${baseUrl}/${path ? `${path}/` : ''}${page > 1 ? `page/${page}/` : ''}${query}`);
    const $ = load(data);
    return {
      currentPage: page,
      hasNextPage: $('.pagination, .nav-links').find('.next, a:contains("Next")').length > 0,
      results: parseHtmlGrid($),
    };
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    // search.php is the site's Typesense search; when it fails or finds nothing, the WordPress
    // search may still find the post.
    try {
      const { data } = await request(`${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=${page}`);
      if (Array.isArray(data?.hits) && data.hits.length > 0) {
        const perPage = data.request_params?.per_page || 15;
        const total = typeof data.found === 'number' ? data.found : 0;
        const results: IMovieResult[] = [];
        for (const hit of data.hits) {
          const doc = hit.document;
          if (!doc) continue;

          const permalink = doc.permalink || '';
          const id = pageId(permalink, baseUrl);
          const rawPostTitle = doc.post_title || '';
          const categories: string[] = Array.isArray(doc.category) ? doc.category : [];
          const isSeries = categories.some((c) => /series/i.test(c)) || SERIES_TITLE.test(rawPostTitle);

          results.push({
            id,
            title: cleanTitle(rawPostTitle),
            url: new PolyURL(permalink, `${baseUrl}/`).href,
            image: doc.post_thumbnail || '',
            ...resultMeta(rawPostTitle, id, isSeries),
          });
        }
        return { currentPage: page, hasNextPage: page * perPage < total, results };
      }
    } catch {}

    return fetchListing('', page, `?s=${encodeURIComponent(query)}`);
  };

  type SeasonPack = { title: string; season: number; url: string };

  const fetchPackEpisodes = async (pack: SeasonPack, postUrl: string): Promise<IMovieEpisode[]> => {
    const { data } = await request(pack.url, postUrl);
    const $ = load(data);
    const episodes: IMovieEpisode[] = [];

    $('h3, h4, h5, p').each((_, element) => {
      const heading = $(element);
      const text = heading.text().trim();
      if (!/episodes?\s*[:\d-]/i.test(text) && !/e\d{1,3}\b/i.test(text) && !/^episode\s*\d+/i.test(text)) return;

      const title = text
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[-:\s]+|[-:\s]+$/g, '')
        .replace(/^episodes?\s*:\s*/i, 'Episode ');
      const number = /\b(?:episode|e)\s*(\d+)/i.exec(title)?.[1];
      const link = downloadLink($, linkBlockAfter(heading));

      if (link?.startsWith('http') && !episodes.some((e) => e.url === link)) {
        episodes.push({
          id: link,
          title,
          number: number ? parseInt(number, 10) : undefined,
          season: pack.season,
          url: link,
        });
      }
    });

    return episodes;
  };

  /** A series post lists a pack per season and quality; each pack's page lists its episodes. */
  const fetchSeriesEpisodes = async ($: CheerioAPI, postUrl: string): Promise<IMovieEpisode[]> => {
    const packs: SeasonPack[] = [];

    $('h3, h4, h5, p').each((_, element) => {
      const heading = $(element);
      const text = heading.text().trim();
      if (!/season\s*\d+|s\d+/i.test(text)) return;

      // Only headings followed by download links are packs. This skips the post title heading
      // ("Download X Season 3 ...") whose next paragraph holds the IMDb link.
      const links = linkBlockAfter(heading)
        .find('a[href]')
        .toArray()
        .map((a) => ({ href: $(a).attr('href') || '', text: $(a).text().trim() }))
        .filter((l) => l.href.startsWith('http') && hostRank(l.href) >= 0 && !/zip|batch|login/i.test(l.text));
      if (!links.length) return;

      // Some blocks list one link per quality ("480p [150MB/E]", "720p [350MB/E]"); prefer V-Cloud otherwise.
      const preferred = links.find((l) => /v-?cloud/i.test(l.text)) ?? links[0]!;
      const best = links.reduce((acc, l) => (qualityRank(l.text) > qualityRank(acc.text) ? l : acc), preferred);
      packs.push({ title: `${text} ${best.text}`, season: extractSeasonNumber(text), url: best.href });
    });

    const bestPerSeason = new Map<number, SeasonPack>();
    for (const pack of packs) {
      const current = bestPerSeason.get(pack.season);
      if (!current || qualityRank(pack.title) > qualityRank(current.title)) bestPerSeason.set(pack.season, pack);
    }

    // A season whose pack page fails to load is left out; the other seasons still list.
    const perSeason = await Promise.allSettled(
      Array.from(bestPerSeason.values()).map((pack) => fetchPackEpisodes(pack, postUrl))
    );
    const episodes = perSeason.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    if (episodes.length) return episodes;

    // No pack page listed episodes: offer the packs themselves.
    return packs.map((pack, i) => ({
      id: pack.url,
      title: pack.title || `Season ${pack.season}`,
      season: pack.season,
      number: i + 1,
      url: pack.url,
    }));
  };

  /** A movie post lists a download link per quality. */
  const movieEpisodes = ($: CheerioAPI, title: string): IMovieEpisode[] => {
    const episodes: IMovieEpisode[] = [];
    $('h3, h4, h5, p').each((_, element) => {
      const heading = $(element);
      const text = heading.text().trim();
      const href = downloadLink($, linkBlockAfter(heading));
      if (!href?.startsWith('http') || episodes.some((e) => e.url === href)) return;
      episodes.push({ id: href, title: text || `${title} HD`, number: episodes.length + 1, season: 1, url: href });
    });
    if (episodes.length) return episodes;

    // No quality blocks: take any download link on the page.
    $('a[href]')
      .toArray()
      .map((a) => $(a).attr('href')!)
      .filter((href) => hostRank(href) >= 0)
      .forEach((href, i) => {
        if (!href.startsWith('http') || episodes.some((e) => e.url === href)) return;
        episodes.push({ id: href, title: `${title} Option ${i + 1}`, number: i + 1, season: 1, url: href });
      });
    return episodes;
  };

  /** @param mediaId post id (its slug) or URL */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    const url = pageUrl(mediaId ?? '', baseUrl);
    const { data } = await request(url);
    const $ = load(data);
    const content = $('.entry-content, .post-content').first();
    // "Series Info" / "Movie Info" block, e.g. "Season: 1-5 ... Released Year: 2008-2013"
    const infoText = $('h3, h4')
      .filter((_, el) => /(series|movie)\s*info/i.test($(el).text()))
      .first()
      .nextAll()
      .slice(0, 2)
      .text()
      .replace(/\s+/g, ' ');

    const rawTitle =
      $('h1.entry-title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      '';
    const title = cleanTitle((rawTitle.split('|')[0] || '').trim());

    let image =
      $('meta[property="og:image"]').attr('content') ||
      content.find('img[data-lazy-src]').attr('data-lazy-src') ||
      content.find('img[data-src]').attr('data-src') ||
      content.find('img').first().attr('src') ||
      '';
    if (image.startsWith('//')) {
      image = `https:${image}`;
    }

    const synopsisHeader = $('h3, h4, h5').filter((_, el) => /synopsis|plot/i.test($(el).text()));
    const synopsis =
      (synopsisHeader.length > 0 ? synopsisHeader.next('p').text().trim() : '') ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '';

    const imdbId = ($('a[href*="imdb.com"]').attr('href')?.match(/tt\d+/) || data.match(/tt\d{7,}/))?.[0];
    const ratingText =
      $('.imdb-score, .starstruck-rating').text() || /IMDb Rating\W*([\d.]+)/i.exec(infoText)?.[1] || '';
    const rating = /(\d+(?:\.\d+)?)/.exec(ratingText)?.[1];

    const pageText = `${title} ${content.text()}`;
    const isSeries =
      /\b(?:web\s*series|season\s*\d+|s\d+\s*e\d+)\b/i.test(pageText) ||
      $('a:contains("V-Cloud"), a:contains("vcloud")').length > 1;

    const episodes = isSeries ? await fetchSeriesEpisodes($, url) : movieEpisodes($, title);
    if (!episodes.length) episodes.push({ id: url, title: title || 'Movie', url, number: 1, season: 1 });

    return {
      id: pageId(url, baseUrl),
      title,
      url,
      image,
      description: synopsis,
      ...(imdbId ? { imdbId } : {}),
      ...(rating ? { rating: parseFloat(rating) } : {}),
      // "Released Year: 2008-2013" gives the first-air year; titles often carry a season's year
      releaseDate: extractYear(/Released?\s*Year\s*:?\s*([^\s]+)/i.exec(infoText)?.[1] ?? '') ?? extractYear(title),
      genres: $('a[rel="category tag"], .category a')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((g) => g && !g.includes('1080p') && !g.includes('720p') && !g.includes('480p')),
      type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
      episodes,
      totalEpisodes: episodes.length,
    };
  };

  /** An episode's download link: `episodeId` when it is one, else the first episode of the post it names. */
  const resolveEpisodeUrl = async (episodeId: string): Promise<string> => {
    if (episodeId?.startsWith('http')) return episodeId;
    const url = (await fetchMediaInfo(episodeId)).episodes?.[0]?.url;
    if (!url) throw new Error(`Unable to resolve episode source for ${episodeId}`);
    return url;
  };

  /** The servers a HubCloud page lists, named by their label ("CF Storage", "10Gbps"), then the page itself. */
  const hubCloudServers = async (url: string): Promise<IEpisodeServer[]> => {
    const servers: IEpisodeServer[] = [];
    try {
      const { sources = [] } = (await HubCloud(ctx).extract(new PolyURL(url))) ?? {};
      for (const source of sources as IVideo[]) {
        const name = source.server || source.quality || 'HubCloud';
        if (!servers.some((s) => s.name === name)) servers.push({ name, url: source.url });
      }
    } catch {
      // The page itself stays a server: fetchEpisodeSources reads it again.
    }
    if (!servers.some((s) => s.name.toLowerCase() === StreamingServersEnum.HubCloud)) {
      servers.push({ name: 'HubCloud', url });
    }
    return servers;
  };

  /**
   * @param episodeId download link from fetchMediaInfo, or a post id (its first episode is used)
   */
  const fetchEpisodeServers = async (episodeId: string, _mediaId?: string): Promise<IEpisodeServer[]> => {
    const episodeUrl = await resolveEpisodeUrl(episodeId);
    if (episodeUrl.includes('vcloud') || episodeUrl.includes('hubcloud')) return hubCloudServers(episodeUrl);

    // A link page (nexdrive) lists the file's hosts.
    const $ = load((await request(episodeUrl)).data);
    const servers: IEpisodeServer[] = [];
    const hubCloudLink = $('a[href*="vcloud"], a[href*="hubcloud"]').attr('href');
    if (hubCloudLink) servers.push(...(await hubCloudServers(hubCloudLink)));
    const fastDlLink = $('a[href*="fastdl"], a:contains("G-Direct")').attr('href');
    if (fastDlLink) servers.push({ name: 'FastDL', url: fastDlLink });
    const filePressLink = $('a[href*="filebee"], a[href*="filepress"]').attr('href');
    if (filePressLink) servers.push({ name: 'Filepress', url: filePressLink });
    return servers.length ? servers : [{ name: 'HubCloud', url: episodeUrl }];
  };

  /** The file behind a FastDL page, which hands it to the browser in `var reurl`. */
  const fastDlFile = async (url: string, referer: string): Promise<string | undefined> => {
    const { data } = await request(url, referer);
    const reurl = /var\s+reurl\s*=\s*['"]([^'"]+)['"]/.exec(data)?.[1];
    return reurl ? unwrapFastDlUrl(reurl) : undefined;
  };

  const filePressFile = async (link: string): Promise<string | undefined> => {
    const id = link.split('/').filter(Boolean).pop();
    const origin = link.split('/').slice(0, 3).join('/');
    const post = (path: string, fileId: unknown) =>
      axios.post(
        `${origin}/api/file/${path}/`,
        { id: fileId, method: 'indexDownlaod', captchaValue: null },
        { headers: { 'Content-Type': 'application/json', 'Referer': origin } }
      );
    const token = await post('downlaod', id);
    if (!token.data?.status || !token.data?.data) return undefined;
    const file = (await post('downlaod2', token.data.data)).data?.data?.[0];
    return file?.startsWith('http') ? file : undefined;
  };

  /**
   * @param episodeId download link from fetchMediaInfo (V-Cloud, HubCloud, nexdrive or FastDL page),
   * or a post id (its first episode is used)
   * @param server label of the sources to list first, e.g. `FastDL` or `CF Storage` (default
   * `HubCloud`: no preference)
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    _mediaId?: string,
    server: StreamingServers | string = StreamingServersEnum.HubCloud
  ): Promise<ISource> => {
    const episodeUrl = await resolveEpisodeUrl(episodeId);
    const episodeQuality =
      /\b(2160p|4k|1080p|720p|480p|360p)\b/i.exec(episodeUrl)?.[1]?.toLowerCase().replace('4k', '2160p') ?? 'auto';

    if (isFastDl(episodeUrl)) {
      const file = (await fastDlFile(episodeUrl, NEXDRIVE_URL)) ?? unwrapFastDlUrl(episodeUrl);
      return {
        headers: { Referer: `${new PolyURL(episodeUrl).origin}/` },
        sources: [{ url: file, server: 'FastDL', quality: episodeQuality, isM3U8: false }],
        download: file,
      };
    }

    // A link page (nexdrive) links to the HubCloud page and to mirrors on FastDL and FilePress.
    // Each mirror is optional: when one fails, the others still play.
    const mirrors: IVideo[] = [];
    let hubCloudUrl = episodeUrl;
    if (!episodeUrl.includes('cloud')) {
      const { data: html } = await request(episodeUrl);
      hubCloudUrl = /<a\s+href="([^"]*cloud\.[^"]*)"/i.exec(html)?.[1] ?? episodeUrl;

      const fastDlLink = /<a\s+href="([^"]*fastdl\.[^"]*)"/i.exec(html)?.[1];
      if (fastDlLink) {
        try {
          const file = await fastDlFile(fastDlLink, episodeUrl);
          if (file) mirrors.push({ url: file, server: 'FastDL', quality: episodeQuality, isM3U8: false });
        } catch {}
      }

      const $ = load(html);
      const filePressLink =
        $('.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"]').parent().attr('href') ||
        $('a[href*="filebee"], a[href*="filepress"]').attr('href');
      if (filePressLink) {
        try {
          const file = await filePressFile(filePressLink);
          if (file) mirrors.push({ url: file, server: 'Filepress', quality: episodeQuality, isM3U8: false });
        } catch {}
      }
    }

    let headers: Record<string, string> = { Referer: baseUrl };
    let hubCloudSources: IVideo[] = [];
    if (hubCloudUrl.includes('cloud')) {
      try {
        const res = await HubCloud(ctx).extract(new PolyURL(hubCloudUrl));
        if (Array.isArray(res?.sources)) {
          hubCloudSources = (res.sources as IVideo[]).map((s) => ({
            ...s,
            server: s.server || s.quality || 'HubCloud',
            // HubCloud labels some sources with their host instead of a quality
            quality:
              s.quality && s.quality !== 'auto' && !/\b(?:server|worker|storage|drain|bot|cloud)\b/i.test(s.quality)
                ? s.quality
                : episodeQuality,
          }));
          if (res.headers) headers = res.headers;
        }
      } catch (err) {
        if (!mirrors.length) throw err;
      }
    }

    let sources = [...mirrors, ...hubCloudSources];

    // `HubCloud` names the HubCloud page as a whole, not one of its sources' labels, so it asks for no order.
    const wanted = server.toLowerCase();
    if (wanted !== StreamingServersEnum.HubCloud) {
      const matches = (s: IVideo) => (s.server || '').toLowerCase().includes(wanted);
      if (sources.some(matches)) sources = [...sources.filter(matches), ...sources.filter((s) => !matches(s))];
    }

    if (sources.length === 0) {
      throw new Error(`[VegaMovies] No streamable video sources found for ${episodeId}`);
    }

    return { headers, sources, download: sources[0]?.url };
  };

  const fetchLatest = (page: number = 1) => fetchListing('', page);

  /**
   * @param filter a category path, e.g. `web-series/netflix`
   */
  const fetchByFilter = (filter: string, page: number = 1) => fetchListing(filter.replace(/^\/|\/$/g, ''), page);

  const fetchRecentMovies = (page: number = 1) => fetchByFilter('category/movies-by-genres', page);

  const fetchRecentTVShows = (page: number = 1) => fetchByFilter('web-series', page);

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
    fetchLatest,
    fetchRecentMovies,
    fetchRecentTVShows,
    fetchByFilter,
  };
}

export type VegaMoviesProviderInstance = ReturnType<typeof createVegaMovies>;
