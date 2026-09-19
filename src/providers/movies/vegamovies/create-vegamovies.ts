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

const cleanTitle = (raw: string): string => {
  let t = raw;

  // 1. Remove leading "Download" or "Watch"
  t = t.replace(/^(?:Download|Watch)\s+/i, '');

  // 2. Truncate at season indicators (e.g. " - Season 1", " (Season 1 – 3)", " Season 1", " S01-S03")
  t = t.replace(/\s*[-–—:]?\s*\(?\b(?:Season\s*\d+|S\d{1,2})\b.*$/i, '');

  // 3. Truncate at 4-digit year in parentheses e.g. "(2025)", "(1999)"
  t = t.replace(/\s*\(\s*(?:19\d{2}|20\d{2})\s*\).*$/, '');

  // 4. Truncate at curly braces e.g. "{Hindi-English-Korean}" or "{E110 - Added}"
  t = t.replace(/\s*\{.*?\}$/, '');

  // 5. Truncate at bracketed metadata e.g. "[S04 E15 Added]", "[320MB]"
  t = t.replace(/\s*\[.*?\]$/, '');

  // 6. Truncate at quality / release / audio / network tags if still present
  t = t.replace(
    /\s*[-–—:]?\s*\b(?:Dual[- ]Audio|Multi[- ]Audio|Hindi[- ](?:Dubbed|ORG)|ORG\s+Dubbed|Blu[- ]?Ray|WEB[- ]?DL|HDRip|HDTC|PreDVDRip|CAMRip|DVDRip|Anime\s+Series|K-DRAMA\s+Series|C-Drama\s+Series|Turkish-Drama\s+Series|Netflix[- ]Series|Disney\+|Hotstar|Amazon\s+Prime|IMAX|Extended|Edition|x264|x265|HEVC|10Bit|480p|720p|1080p|2160p|4k)\b.*$/i,
    ''
  );

  // 7. Remove any trailing punctuation or leftover dashes/colons/slashes
  return t
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[-–—:|/]+$/, '')
    .trim();
};

export function createVegaMovies(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL, USER_AGENT } = ctx;
  const { HubCloud } = extractors;
  const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://new2.vegamovies.futbol', customBaseURL);

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
    'User-Agent':
      USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  /**
   * Parse year from title string
   */
  const extractYear = (text: string): string | undefined => {
    const match = text.match(/\b(19\d{2}|20\d{2})\b/);
    return match ? match[1] : undefined;
  };

  /**
   * Parse season number from title/text
   */
  const extractSeasonNumber = (text: string): number => {
    const match = text.match(/season\s*(\d+)|s(\d+)/i);
    if (match) {
      const num = match[1] || match[2];
      if (num) return parseInt(num, 10);
    }
    return 1;
  };

  /**
   * Helper to parse HTML grid items into IMovieResult list
   */
  const parseHtmlGrid = (html: string): IMovieResult[] => {
    const $ = load(html);
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

      const postUrl = new PolyURL(href, `${config.baseUrl}/`);
      const cleanId = postUrl.pathname.replace(/^\/|\/$/g, '');
      if (!cleanId || seen.has(cleanId)) return;
      seen.add(cleanId);

      const rawTitle =
        element.find('.poster-title, .entry-title, .post-title').text().trim() ||
        element.find('img').attr('alt') ||
        linkEl.attr('aria-label') ||
        linkEl.attr('title') ||
        '';

      const releaseDate = extractYear(rawTitle);
      const isSeries =
        /\b(?:season|s\d+|web series|series)\b/i.test(rawTitle) || href.includes('season') || href.includes('series');

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
        id: cleanId,
        title,
        url: postUrl.href,
        image,
        releaseDate,
        type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
      });
    });

    return results;
  };

  /**
   * Search for movies/TV shows
   * @param query search query string
   * @param page page number (default 1)
   */
  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    // Primary: Typesense search.php endpoint
    try {
      const searchUrl = `${config.baseUrl}/search.php?q=${encodeURIComponent(query)}&page=${page}`;
      const { data } = await axios.get(searchUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      if (data && Array.isArray(data.hits) && data.hits.length > 0) {
        const perPage = data.request_params?.per_page || 15;
        const total = typeof data.found === 'number' ? data.found : 0;
        searchResult.hasNextPage = page * perPage < total;

        for (const hit of data.hits) {
          const doc = hit.document;
          if (!doc) continue;

          const permalink = doc.permalink || '';
          const postUrl = new PolyURL(permalink, `${config.baseUrl}/`);
          const cleanId = postUrl.pathname.replace(/^\/|\/$/g, '');
          const rawPostTitle = doc.post_title || '';
          const title = cleanTitle(rawPostTitle);

          const categories: string[] = Array.isArray(doc.category) ? doc.category : [];
          const isSeries =
            categories.some((c) => /series/i.test(c)) || /\b(?:season|s\d+|web series|series)\b/i.test(rawPostTitle);

          searchResult.results.push({
            id: cleanId,
            title,
            url: postUrl.href,
            image: doc.post_thumbnail || '',
            releaseDate: extractYear(rawPostTitle) || doc.post_date,
            type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
          });
        }

        return searchResult;
      }
    } catch {
      // Fallback to HTML scraping search
    }

    // Fallback: WordPress HTML search
    try {
      const fallbackUrl =
        page === 1
          ? `${config.baseUrl}/?s=${encodeURIComponent(query)}`
          : `${config.baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`;

      const { data } = await axios.get(fallbackUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      const $ = load(data);
      searchResult.results = parseHtmlGrid(data);

      const navSelector = '.pagination, .nav-links';
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;

      return searchResult;
    } catch (err: any) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch media information (including seasons and episodes)
   * @param mediaId media link or slug ID
   */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    let fullUrl = mediaId;
    if (!fullUrl?.startsWith('http')) {
      fullUrl = `${config.baseUrl}/${(mediaId ?? '').replace(/^\//, '')}`;
    }

    const cleanId = fullUrl.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '');

    const movieInfo: IMovieInfo = {
      id: cleanId,
      title: '',
      url: fullUrl,
    };

    try {
      const { data } = await axios.get(fullUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      const $ = load(data);

      // Title extraction
      const rawTitle =
        $('h1.entry-title').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        '';
      movieInfo.title = cleanTitle((rawTitle.split('|')[0] || '').trim());

      // Poster image
      let image =
        $('meta[property="og:image"]').attr('content') ||
        $('.entry-content img[data-lazy-src]').attr('data-lazy-src') ||
        $('.entry-content img[data-src]').attr('data-src') ||
        $('.entry-content img').first().attr('src') ||
        '';
      if (image?.startsWith('//')) {
        image = `https:${image}`;
      }
      movieInfo.image = image;

      // Synopsis / description
      let synopsis = '';
      const synopsisHeader = $('h3, h4, h5').filter((_, el) => /synopsis|plot/i.test($(el).text()));
      if (synopsisHeader.length > 0) {
        synopsis = synopsisHeader.next('p').text().trim();
      }
      if (!synopsis) {
        synopsis = $('meta[property="og:description"]').attr('content')?.trim() || '';
      }
      movieInfo.description = synopsis;

      // IMDb ID
      const imdbMatch = $('a[href*="imdb.com"]').attr('href')?.match(/tt\d+/) || data.match(/tt\d{7,}/);
      if (imdbMatch?.[0]) {
        movieInfo.imdbId = imdbMatch[0];
      }

      // Rating
      const ratingText = $('.imdb-score, .starstruck-rating').text();
      const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
      if (ratingMatch?.[1]) {
        movieInfo.rating = parseFloat(ratingMatch[1]);
      }

      // Release year
      movieInfo.releaseDate = extractYear(movieInfo.title);

      // Genres
      movieInfo.genres = $('a[rel="category tag"], .category a')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((g) => g && !g.includes('1080p') && !g.includes('720p') && !g.includes('480p'));

      // Determine type
      const pageText = `${movieInfo.title} ${$('.entry-content').text()}`;
      const isSeries =
        /\b(?:web\s*series|season\s*\d+|s\d+\s*e\d+)\b/i.test(pageText) ||
        $('a:contains("V-Cloud"), a:contains("vcloud")').length > 1;
      movieInfo.type = isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;

      // Extract quality blocks and download buttons
      const episodesList: IMovieEpisode[] = [];

      if (movieInfo.type === TvTypeEnum.TVSERIES) {
        // Collect season intermediate links
        type SeasonPack = {
          title: string;
          season: number;
          url: string;
        };
        const seasonPacks: SeasonPack[] = [];

        $('h3, h4, h5, p').each((_, element) => {
          const el = $(element);
          const blockText = el.text().trim();
          if (/season\s*\d+|s\d+/i.test(blockText)) {
            const seasonNum = extractSeasonNumber(blockText);

            let nextP = el.next();
            while (nextP.length && !nextP.is('p') && !nextP.find('a[href]').length) {
              nextP = nextP.next();
            }

            // Prefer V-Cloud link, avoid Zip / Batch
            let btn = nextP.find('a:contains("V-Cloud"), a:contains("vcloud"), a[href*="vcloud"]').first();
            if (!btn.length) {
              btn = nextP
                .find('a')
                .filter((_, a) => {
                  const txt = $(a).text().toLowerCase();
                  const href = ($(a).attr('href') || '').toLowerCase();
                  return (
                    !txt.includes('zip') && !txt.includes('batch') && !href.includes('zip') && !href.includes('batch')
                  );
                })
                .first();
            }

            const btnHref = btn.attr('href');
            if (btnHref && btnHref?.startsWith('http')) {
              seasonPacks.push({
                title: blockText,
                season: seasonNum,
                url: btnHref,
              });
            }
          }
        });

        const getPackPriority = (t: string): number => {
          if (/1080p|2160p|4k/i.test(t)) return 3;
          if (/720p/i.test(t)) return 2;
          if (/480p/i.test(t)) return 1;
          return 0;
        };

        // Deduplicate season packs: pick highest quality pack per season
        const selectedPacksBySeason = new Map<number, SeasonPack>();
        for (const pack of seasonPacks) {
          if (!selectedPacksBySeason.has(pack.season)) {
            selectedPacksBySeason.set(pack.season, pack);
          } else {
            const existing = selectedPacksBySeason.get(pack.season)!;
            if (getPackPriority(pack.title) > getPackPriority(existing.title)) {
              selectedPacksBySeason.set(pack.season, pack);
            }
          }
        }

        // Fetch episodes from each season pack's intermediate page
        const packResults = await Promise.allSettled(
          Array.from(selectedPacksBySeason.values()).map(async (pack) => {
            const res = await axios.get(pack.url, {
              headers: {
                ...defaultHeaders,
                Referer: fullUrl,
              },
            });
            const $ep = load(res.data);
            const eps: IMovieEpisode[] = [];

            $ep('h3, h4, h5, p').each((_, element) => {
              const el = $ep(element);
              const text = el.text().trim();
              if (/episodes?\s*[:\d\-]/i.test(text) || /e\d{1,3}\b/i.test(text) || /^episode\s*\d+/i.test(text)) {
                const epTitle = text
                  .replace(/\s+/g, ' ')
                  .trim()
                  .replace(/^[-:\s]+|[-:\s]+$/g, '')
                  .replace(/^episodes?\s*:\s*/i, 'Episode ');

                const epNumMatch = epTitle.match(/\b(?:episode|e)\s*(\d+)/i);
                const epNumber = epNumMatch && epNumMatch[1] ? parseInt(epNumMatch[1], 10) : undefined;

                let nextP = el.next();
                while (nextP.length && !nextP.is('p') && !nextP.find('a[href]').length) {
                  nextP = nextP.next();
                }

                const link =
                  nextP.find('a[href*="vcloud"]').attr('href') ||
                  nextP.find('a[href*="hubcloud"]').attr('href') ||
                  nextP.find('a[href*="fastdl"]').attr('href') ||
                  nextP.find('.btn-outline').parent().attr('href') ||
                  nextP.find('.btn-outline').attr('href') ||
                  nextP.find('a[href]').first().attr('href');

                if (link && link?.startsWith('http') && !eps.some((e) => e.url === link)) {
                  eps.push({
                    id: link,
                    title: epTitle,
                    number: epNumber,
                    season: pack.season,
                    url: link,
                  });
                }
              }
            });

            return eps;
          })
        );

        for (const r of packResults) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            episodesList.push(...r.value);
          }
        }

        // Fallback: If no episodes resolved from intermediate page, expose season pack links as episodes
        if (episodesList.length === 0 && seasonPacks.length > 0) {
          for (let i = 0; i < seasonPacks.length; i++) {
            const sp = seasonPacks[i];
            if (sp) {
              episodesList.push({
                id: sp.url,
                title: sp.title || `Season ${sp.season}`,
                season: sp.season,
                number: i + 1,
                url: sp.url,
              });
            }
          }
        }
      } else {
        // Movie: extract quality options
        let count = 0;
        $('h3, h4, h5, p').each((_, element) => {
          const el = $(element);
          const text = el.text().trim();
          const qualityMatch = text.match(/\d+p\b/i);

          let nextP = el.next();
          while (nextP.length && !nextP.is('p') && !nextP.find('a[href]').length) {
            nextP = nextP.next();
          }

          const btn =
            nextP.find('a[href*="nexdrive"], a[href*="vcloud"], a[href*="hubcloud"], a[href*="fastdl"]').first()
              .length > 0
              ? nextP.find('a[href*="nexdrive"], a[href*="vcloud"], a[href*="hubcloud"], a[href*="fastdl"]').first()
              : nextP.find('.dwd-button, .btn-outline').first().is('a')
                ? nextP.find('.dwd-button, .btn-outline').first()
                : nextP.find('.dwd-button, .btn-outline').first().parent('a');

          const btnHref = btn.attr('href');
          if (btnHref && btnHref?.startsWith('http') && !episodesList.some((e) => e.url === btnHref)) {
            count++;
            episodesList.push({
              id: btnHref,
              title: text || `${movieInfo.title} ${qualityMatch ? qualityMatch[0] : 'HD'}`,
              number: count,
              season: 1,
              url: btnHref,
            });
          }
        });

        // If no quality blocks found, check for generic download buttons
        if (episodesList.length === 0) {
          $('a[href*="nexdrive.fit"], a[href*="vcloud"], a[href*="hubcloud"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href?.startsWith('http') && !episodesList.some((e) => e.url === href)) {
              episodesList.push({
                id: href,
                title: `${movieInfo.title} Option ${i + 1}`,
                number: i + 1,
                season: 1,
                url: href,
              });
            }
          });
        }
      }

      // Final fallback: at least 1 episode pointing to the media URL
      if (episodesList.length === 0) {
        episodesList.push({
          id: movieInfo.url || fullUrl,
          title: movieInfo.title || 'Movie',
          url: movieInfo.url || fullUrl,
          number: 1,
          season: 1,
        });
      }

      movieInfo.episodes = episodesList;
      movieInfo.totalEpisodes = episodesList.length;

      return movieInfo;
    } catch (err: any) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch available servers for a given episode
   * @param episodeId episode URL or intermediate link
   * @param mediaId optional media link or slug
   */
  const fetchEpisodeServers = async (episodeId: string, mediaId?: string): Promise<IEpisodeServer[]> => {
    const servers: IEpisodeServer[] = [];

    let resolvedUrl = episodeId;
    if (!resolvedUrl?.startsWith('http')) {
      try {
        const info = await fetchMediaInfo(episodeId);
        const firstEp = info.episodes?.[0];
        if (firstEp?.url) {
          resolvedUrl = firstEp.url;
        }
      } catch {}
    }

    if (!resolvedUrl?.startsWith('http')) {
      return [{ name: 'HubCloud', url: episodeId }];
    }

    // If already direct V-Cloud / HubCloud link
    if (resolvedUrl.includes('vcloud') || resolvedUrl.includes('hubcloud')) {
      try {
        const hubCloudExtractor = HubCloud(ctx);
        const hubRes = await hubCloudExtractor.extract(new PolyURL(resolvedUrl));
        if (hubRes?.sources && hubRes.sources.length > 0) {
          for (const s of hubRes.sources) {
            const sName = (s as any).server || s.quality || 'HubCloud';
            if (!servers.some((srv) => srv.name === sName)) {
              servers.push({
                name: sName,
                url: s.url,
              });
            }
          }
        }
      } catch {}

      if (!servers.some((s) => s.name.toLowerCase() === 'hubcloud')) {
        servers.push({ name: 'HubCloud', url: resolvedUrl });
      }

      return servers;
    }

    // If intermediate page (e.g. nexdrive.fit)
    try {
      const { data } = await axios.get(resolvedUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      const $ = load(data);

      const vcloudLink = $('a[href*="vcloud"], a[href*="hubcloud"]').attr('href');
      if (vcloudLink) {
        try {
          const hubCloudExtractor = HubCloud(ctx);
          const hubRes = await hubCloudExtractor.extract(new PolyURL(vcloudLink));
          if (hubRes?.sources && hubRes.sources.length > 0) {
            for (const s of hubRes.sources) {
              const sName = (s as any).server || s.quality || 'HubCloud';
              if (!servers.some((srv) => srv.name === sName)) {
                servers.push({
                  name: sName,
                  url: s.url,
                });
              }
            }
          }
        } catch {}

        if (!servers.some((s) => s.name.toLowerCase() === 'hubcloud')) {
          servers.push({ name: 'HubCloud', url: vcloudLink });
        }
      }

      const gdirectLink = $('a[href*="fastdl"], a:contains("G-Direct")').attr('href');
      if (gdirectLink) {
        servers.push({ name: 'FastDL', url: gdirectLink });
      }

      const filepressLink = $('a[href*="filebee"], a[href*="filepress"]').attr('href');
      if (filepressLink) {
        servers.push({ name: 'Filepress', url: filepressLink });
      }
    } catch {
      // Ignore intermediate page parse error
    }

    if (servers.length === 0) {
      servers.push({ name: 'HubCloud', url: resolvedUrl });
    }

    return servers;
  };

  /**
   * Fetch streaming sources for an episode
   * @param episodeId episode URL (vcloud link, nexdrive intermediate link, or slug)
   * @param mediaId media link or slug (optional)
   * @param server requested server (default HubCloud)
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    mediaId?: string,
    server: StreamingServers | string = StreamingServersEnum.HubCloud
  ): Promise<ISource> => {
    let resolvedUrl = episodeId;

    // If episodeId is not an HTTP URL, resolve via fetchMediaInfo
    if (!resolvedUrl?.startsWith('http')) {
      const info = await fetchMediaInfo(episodeId);
      const firstEp = info.episodes?.[0];
      if (firstEp?.url) {
        resolvedUrl = firstEp.url;
      } else {
        throw new Error(`Unable to resolve episode source for ${episodeId}`);
      }
    }

    const epQualityMatch = resolvedUrl.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
    const epQuality = epQualityMatch
      ? epQualityMatch[1]!.toLowerCase() === '4k'
        ? '2160p'
        : epQualityMatch[1]!.toLowerCase()
      : 'auto';

    const extraSources: IVideo[] = [];

    // If not a direct cloud link (e.g. intermediate dotlink / nexdrive page)
    if (!resolvedUrl.includes('cloud')) {
      try {
        const dotlinkRes = await axios.get(resolvedUrl, { headers: defaultHeaders });
        const dotlinkText = dotlinkRes.data;

        // Extract vlink (HubCloud / V-Cloud)
        const vlinkMatch = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i);
        if (vlinkMatch?.[1]) {
          resolvedUrl = vlinkMatch[1];
        }

        // Extract FastDL direct stream if available
        const fastdlMatch = dotlinkText.match(/<a\s+href="([^"]*fastdl\.[^"]*)"/i);
        if (fastdlMatch?.[1]) {
          try {
            const fdlRes = await axios.get(fastdlMatch[1], {
              headers: { ...defaultHeaders, Referer: resolvedUrl },
            });
            const reurlMatch = fdlRes.data.match(/var\s+reurl\s*=\s*['"]([^'"]+)['"]/);
            if (reurlMatch?.[1]) {
              extraSources.push({
                url: reurlMatch[1],
                server: 'FastDL',
                quality: epQuality,
                isM3U8: false,
              });
            }
          } catch {}
        }

        // Extract Filepress stream if available (as in reference stream.ts)
        try {
          const $ = load(dotlinkText);
          const filepressLink =
            $('.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"]').parent().attr('href') ||
            $('a[href*="filebee"], a[href*="filepress"]').attr('href');

          if (filepressLink) {
            const filepressID = filepressLink.split('/').filter(Boolean).pop();
            const filepressBaseUrl = filepressLink.split('/').slice(0, 3).join('/');

            const fpRes1 = await axios.post(
              `${filepressBaseUrl}/api/file/downlaod/`,
              { id: filepressID, method: 'indexDownlaod', captchaValue: null },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Referer': filepressBaseUrl,
                },
              }
            );

            if (fpRes1.data?.status && fpRes1.data?.data) {
              const fpToken = fpRes1.data.data;
              const fpRes2 = await axios.post(
                `${filepressBaseUrl}/api/file/downlaod2/`,
                { id: fpToken, method: 'indexDownlaod', captchaValue: null },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Referer': filepressBaseUrl,
                  },
                }
              );

              const fpStreamUrl = fpRes2.data?.data?.[0];
              if (fpStreamUrl && fpStreamUrl?.startsWith('http')) {
                extraSources.push({
                  url: fpStreamUrl,
                  server: 'Filepress',
                  quality: epQuality,
                  isM3U8: false,
                });
              }
            }
          }
        } catch {}
      } catch {}
    }

    // If resolvedUrl is a FastDL link directly
    if (resolvedUrl.includes('fastdl.zip')) {
      try {
        const { data } = await axios.get(resolvedUrl, {
          headers: {
            ...defaultHeaders,
            Referer: 'https://nexdrive.fit/',
          },
        });

        const reurlMatch = data.match(/var\s+reurl\s*=\s*['"]([^'"]+)['"]/);
        const directUrl = reurlMatch ? reurlMatch[1] : resolvedUrl;

        return {
          headers: { Referer: 'https://fastdl.zip/' },
          sources: [{ url: directUrl, server: 'FastDL', quality: epQuality, isM3U8: false }, ...extraSources],
          download: directUrl,
        };
      } catch {}
    }

    // HubCloud extraction
    let hubCloudSources: IVideo[] = [];
    let hubHeaders: Record<string, string> = { Referer: config.baseUrl };

    if (resolvedUrl.includes('cloud')) {
      try {
        const hubCloudExtractor = HubCloud(ctx);
        const hubCloudRes = await hubCloudExtractor.extract(new PolyURL(resolvedUrl));
        if (hubCloudRes?.sources && Array.isArray(hubCloudRes.sources)) {
          hubCloudSources = hubCloudRes.sources.map((s: IVideo) => ({
            ...s,
            server: (s as any).server || s.quality || 'HubCloud',
            quality:
              s.quality && s.quality !== 'auto' && !/\b(?:server|worker|storage|drain|bot|cloud)\b/i.test(s.quality)
                ? s.quality
                : epQuality !== 'auto'
                  ? epQuality
                  : 'auto',
          }));
          if (hubCloudRes.headers) {
            hubHeaders = hubCloudRes.headers;
          }
        }
      } catch {}
    }

    let allSources = [...extraSources, ...hubCloudSources];

    // Filter or prioritize requested server if specified and not 'hubcloud'
    if (server && server.toLowerCase() !== 'hubcloud') {
      const serverLower = server.toLowerCase();
      const matched = allSources.filter((s) => (s.server || '').toLowerCase().includes(serverLower));
      if (matched.length > 0) {
        const others = allSources.filter((s) => !(s.server || '').toLowerCase().includes(serverLower));
        allSources = [...matched, ...others];
      }
    }

    if (allSources.length === 0) {
      throw new Error(`[VegaMovies] No streamable video sources found for ${episodeId}`);
    }

    return {
      headers: hubHeaders,
      sources: allSources,
      download: allSources[0]?.url,
    };
  };

  /**
   * Fetch latest releases from homepage
   * @param page page number (default 1)
   */
  const fetchLatest = async (page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const url = page === 1 ? `${config.baseUrl}/` : `${config.baseUrl}/page/${page}/`;
      const { data } = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      const $ = load(data);
      searchResult.results = parseHtmlGrid(data);

      const navSelector = '.pagination, .nav-links';
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;

      return searchResult;
    } catch (err: any) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch recent movies
   */
  const fetchRecentMovies = async (page: number = 1): Promise<ISearch<IMovieResult>> => {
    return fetchByFilter('category/movies-by-genres', page);
  };

  /**
   * Fetch recent TV shows
   */
  const fetchRecentTVShows = async (page: number = 1): Promise<ISearch<IMovieResult>> => {
    return fetchByFilter('web-series', page);
  };

  /**
   * Fetch movies/shows by category filter
   * @param filter path filter (e.g. 'web-series/netflix')
   * @param page page number (default 1)
   */
  const fetchByFilter = async (filter: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const cleanFilter = filter.replace(/^\/|\/$/g, '');
      const url = page === 1 ? `${config.baseUrl}/${cleanFilter}/` : `${config.baseUrl}/${cleanFilter}/page/${page}/`;

      const { data } = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl,
        },
      });

      const $ = load(data);
      searchResult.results = parseHtmlGrid(data);

      const navSelector = '.pagination, .nav-links';
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;

      return searchResult;
    } catch (err: any) {
      throw new Error((err as Error).message);
    }
  };

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
