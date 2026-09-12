import axios from 'axios';

import {
  type ExtractorContext,
  type ISource,
  type IVideo,
  type IVideoExtractor,
  type ISubtitle,
} from '../models';
import type { PolyURL } from '../utils/url-polyfill';

/**
 * MegaPlay extractor factory that relies on the shared extractor context
 * @param ctx ExtractorContext containing axios, load, USER_AGENT, PolyURL
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function MegaPlay(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'MegaPlay';
  const sources: IVideo[] = [];
  const client = ctx.axios ?? axios;
  const load = ctx.load;
  const userAgent =
    ctx.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  const extract = async (videoUrl: PolyURL, referer?: string): Promise<ISource> => {
    try {
      const embedHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
      const urlObj =
        typeof videoUrl === 'object' && videoUrl.origin
          ? videoUrl
          : new (ctx.PolyURL || URL)(embedHref);
      const origin = urlObj.origin || 'https://megaplay.buzz';
      const pageReferer = referer || embedHref;

      const pageHeaders = {
        'User-Agent': userAgent,
        'Referer': pageReferer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      };

      const { data: html } = await client.get(embedHref, { headers: pageHeaders });

      const $ = load(html);
      const playerDiv = $('#megaplay-player');

      if (!playerDiv.length) {
        throw new Error('[MegaPlay] Could not find player element (#megaplay-player)');
      }

      const mediaId = playerDiv.attr('data-id');
      if (!mediaId) {
        throw new Error('[MegaPlay] Could not find data-id on player element');
      }

      const sParam = urlObj.searchParams?.get('s');
      const sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : '';

      const ajaxHeaders = {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${origin}/`,
        'User-Agent': userAgent,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      };

      let defSourcesJson: any = null;
      let defStreamUrl: string | null = null;
      try {
        const { data: resData } = await client.get(
          `${origin}/stream/getSources?id=${mediaId}${sQuery}`,
          { headers: ajaxHeaders }
        );
        defSourcesJson = typeof resData === 'string' ? JSON.parse(resData) : resData;
        defStreamUrl =
          defSourcesJson?.sources?.file ||
          (Array.isArray(defSourcesJson?.sources) ? defSourcesJson.sources[0]?.file : null);
      } catch {
        // Fallback to getSourcesNew
      }

      let newSourcesJson: any = null;
      let newStreamUrl: string | null = null;
      try {
        const { data: newResData } = await client.get(
          `${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`,
          { headers: ajaxHeaders }
        );
        newSourcesJson = typeof newResData === 'string' ? JSON.parse(newResData) : newResData;
        newStreamUrl =
          newSourcesJson?.sources?.file ||
          (Array.isArray(newSourcesJson?.sources) ? newSourcesJson.sources[0]?.file : null);
      } catch {
        // Ignore if defStreamUrl succeeded
      }

      const streamUrl = defStreamUrl || newStreamUrl;
      if (!streamUrl) {
        throw new Error('[MegaPlay] No video stream URL found from /getSources or /getSourcesNew');
      }

      const cleanStreamUrl = String(streamUrl).replace(/\\/g, '');
      const isM3U8 = cleanStreamUrl.includes('.m3u8');

      const extractedSources: IVideo[] = [];
      const defaultSource: IVideo = {
        url: cleanStreamUrl,
        isM3U8,
        quality: 'auto',
      };

      if (isM3U8) {
        try {
          const { data: m3u8Data } = await client.get(cleanStreamUrl, {
            headers: {
              'Referer': `${origin}/`,
              'User-Agent': userAgent,
            },
          });

          if (typeof m3u8Data === 'string' && m3u8Data.includes('#EXT-X-STREAM-INF')) {
            const lines = m3u8Data.split('\n');
            const streamBasePath = cleanStreamUrl.substring(0, cleanStreamUrl.lastIndexOf('/'));
            const streamOrigin = new (ctx.PolyURL || URL)(cleanStreamUrl).origin;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]?.trim();
              if (line && line.startsWith('#EXT-X-STREAM-INF')) {
                const resolutionMatch = line.match(/RESOLUTION=\d+x(\d+)/);
                const quality = resolutionMatch
                  ? `${resolutionMatch[1]}p`
                  : `quality_${extractedSources.length + 1}`;
                const nextLine = lines[i + 1]?.trim();
                if (nextLine && !nextLine.startsWith('#')) {
                  const variantUrl =
                    nextLine.startsWith('http://') || nextLine.startsWith('https://')
                      ? nextLine
                      : nextLine.startsWith('/')
                      ? `${streamOrigin}${nextLine}`
                      : `${streamBasePath}/${nextLine}`;

                  extractedSources.push({
                    url: variantUrl,
                    isM3U8: true,
                    quality,
                  });
                }
              }
            }
          }
        } catch {
          // If fetching variants fails, defaultSource will be returned
        }
      }

      const finalSources =
        extractedSources.length > 0 ? [...extractedSources, defaultSource] : [defaultSource];

      const tracks = defSourcesJson?.tracks || newSourcesJson?.tracks || [];
      const subtitles: ISubtitle[] = [];
      if (Array.isArray(tracks)) {
        for (const track of tracks) {
          if (track?.file) {
            subtitles.push({
              url: String(track.file).replace(/\\/g, ''),
              lang: track.label || track.kind || 'English',
            });
          }
        }
      }

      const intro = defSourcesJson?.intro || newSourcesJson?.intro;
      const outro = defSourcesJson?.outro || newSourcesJson?.outro;

      return {
        sources: finalSources,
        subtitles,
        headers: {
          'Referer': `${origin}/`,
        },
        intro: intro ? { start: intro.start, end: intro.end } : undefined,
        outro: outro ? { start: outro.start, end: outro.end } : undefined,
        embedURL: embedHref,
      };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}

export default MegaPlay;
