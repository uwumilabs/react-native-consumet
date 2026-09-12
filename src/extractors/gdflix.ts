import { type ExtractorContext, type ISource, type IVideo, type IVideoExtractor } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * GDFlix extractor function / factory relying on ExtractorContext
 * Follows react-native-consumet conventions (Kwik, MegaUp, MegaPlay)
 */
export function GDFlix(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'GDFlix';
  const sources: IVideo[] = [];
  const { axios: client, load, USER_AGENT, PolyURL } = ctx;
  const userAgent = USER_AGENT || DEFAULT_USER_AGENT;

  const extract = async (videoUrl: PolyURL, referer?: string): Promise<ISource> => {
    try {
      const urlHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
      const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      const baseUrl = urlObj.origin;

      const pageHeaders: Record<string, string> = {
        'User-Agent': userAgent,
        'Referer': referer || baseUrl,
      };

      const res = await client.get(urlHref, { headers: pageHeaders });
      let $ = load(res.data);

      // Handle location.replace redirect in body onload
      const bodyOnload = $('body').attr('onload');
      if (bodyOnload?.includes('location.replace')) {
        const redirectUrl = bodyOnload.split("location.replace('")?.[1]?.split("'")?.[0];
        if (redirectUrl) {
          const redirectRes = await client.get(redirectUrl, { headers: pageHeaders });
          $ = load(redirectRes.data);
        }
      }

      const rawTitle = $('title').text() || '';
      const qualityMatch = rawTitle.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
      const pageQuality = qualityMatch
        ? qualityMatch[1]!.toLowerCase() === '4k'
          ? '2160p'
          : qualityMatch[1]!.toLowerCase()
        : 'auto';

      const extractedSources: IVideo[] = [];

      // 1. Resume Cloud / Resume Bot
      try {
        const resumeDrive = $('.btn-secondary').attr('href') || '';
        if (resumeDrive) {
          if (resumeDrive.includes('indexbot')) {
            const resumeBotRes = await client.get(resumeDrive, { headers: pageHeaders });
            const tokenMatch = resumeBotRes.data.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/);
            const resumeBotToken = tokenMatch ? tokenMatch[1] : '';

            const pathMatch = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/);
            const resumeBotPath = pathMatch ? pathMatch[1] : '';
            const resumeBotBaseUrl = resumeDrive.split('/download')[0];

            if (resumeBotToken && resumeBotPath) {
              const postRes = await client.post(
                `${resumeBotBaseUrl}/download?id=${resumeBotPath}`,
                `token=${encodeURIComponent(resumeBotToken)}`,
                {
                  headers: {
                    'Referer': resumeDrive,
                    'Cookie': 'PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308',
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                }
              );
              const downloadUrl = postRes.data?.url;
              if (downloadUrl) {
                extractedSources.push({
                  url: downloadUrl,
                  server: 'ResumeBot',
                  quality: pageQuality,
                  isM3U8: downloadUrl.includes('.m3u8'),
                });
              }
            }
          } else {
            const targetUrl = resumeDrive.startsWith('http') ? resumeDrive : `${baseUrl}${resumeDrive}`;
            const resumeDriveRes = await client.get(targetUrl, { headers: pageHeaders });
            const $resumeDrive = load(resumeDriveRes.data);
            const resumeUrl = $resumeDrive('.btn-success').attr('href');
            if (resumeUrl) {
              extractedSources.push({
                url: resumeUrl,
                server: 'ResumeCloud',
                quality: pageQuality,
                isM3U8: resumeUrl.includes('.m3u8'),
              });
            }
          }
        }
      } catch {
        // Resume link not found
      }

      // 2. Instant Link (G-Drive)
      try {
        const seed = $('.btn-danger').attr('href') || '';
        if (seed) {
          if (!seed.includes('?url=')) {
            const headRes = await client.head(seed, { headers: pageHeaders });
            const redirected = (headRes.request as any)?.responseURL || seed;
            const driveUrl = redirected.includes('?url=') ? redirected.split('?url=')[1] : redirected;
            if (driveUrl) {
              extractedSources.push({
                url: driveUrl,
                server: 'G-Drive',
                quality: pageQuality,
                isM3U8: driveUrl.includes('.m3u8'),
              });
            }
          } else {
            const instantToken = seed.split('=')[1];
            const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';

            if (instantToken) {
              const postRes = await client.post(videoSeedUrl, `keys=${encodeURIComponent(instantToken)}`, {
                headers: {
                  'x-token': videoSeedUrl,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
              });
              const instantLinkData = typeof postRes.data === 'string' ? JSON.parse(postRes.data) : postRes.data;
              if (instantLinkData && instantLinkData.error === false && instantLinkData.url) {
                extractedSources.push({
                  url: instantLinkData.url,
                  server: 'G-Drive (download only)',
                  quality: pageQuality,
                  isM3U8: instantLinkData.url.includes('.m3u8'),
                });
              }
            }
          }
        }
      } catch {
        // Instant link not found
      }

      return {
        sources: extractedSources,
        headers: {
          'User-Agent': userAgent,
          'Referer': baseUrl,
        },
      };
    } catch (error) {
      throw new Error(`[GDFlix] Failed to extract: ${(error as Error).message}`);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}

export default GDFlix;
