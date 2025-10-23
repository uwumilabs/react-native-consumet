import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../models';

/**
 * MegaCloud extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function MegaCloud(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'MegaCloud';
  const sources: IVideo[] = [];
  const { axios, load, USER_AGENT, PolyURL } = ctx;
  /**
   * Thanks to https://github.com/yogesh-hacker for the original implementation.
   */

  async function getSources(embed_url: URL, site: string) {
    const regex = /\/([^/?]+)(?=\?)/;
    const xrax = embed_url.toString().match(regex)?.[1];
    const basePath = embed_url.pathname.split('/').slice(0, 4).join('/');

    const url = `${embed_url.origin}${basePath}/getSources?id=${xrax}}`;
    const getKeyType = url.includes('mega') ? 'mega' : url.includes('videostr') ? 'vidstr' : 'rabbit';
    // console.log(`🔗 Fetching sources from: ${url} with key type: ${getKeyType}`);
    //gets the base64 encoded string from the URL and key in parallel
    let key;

    const headers = {
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': site,
      'User-Agent': USER_AGENT,
    };

    try {
      const { data: keyData } = await axios?.get(
        'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json'
      );
      key = keyData;
    } catch (err) {
      console.error('❌ Error fetching key:', err);
      return;
    }
    // console.log(`🔗 Fetched data: ${key[getKeyType]}`);
    let videoTag;
    let embedRes;
    try {
      embedRes = await axios?.get(embed_url.href, { headers });
      const $ = load(embedRes.data);
      videoTag = $('#megacloud-player');
    } catch (error) {
      console.error('❌ Error fetching embed URL:', error);
      return;
    }

    if (!videoTag.length) {
      console.error('❌ Looks like URL expired!');
      return;
    }

    const rawText = embedRes.data;

    let nonceMatch = rawText.match(/\b[a-zA-Z0-9]{48}\b/);
    if (!nonceMatch) {
      const altMatch = rawText.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
      if (altMatch) nonceMatch = [altMatch.slice(1).join('')];
    }

    const nonce = nonceMatch?.[0];
    if (!nonce) return console.error('❌ Nonce not found!');
    const fileId = videoTag.attr('data-id');

    const { data: encryptedResData } = await axios.get(
      `${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`,
      {
        headers,
      }
    );
    // console.log(
    //   `🔗 Encrypted response:`,
    //   encryptedResData,
    //   `${embed_url.origin}${basePath}/getSources?id=${xrax}&_k=${nonce}`
    // );
    const encrypted = encryptedResData.encrypted;
    const sources = encryptedResData.sources;
    let videoSrc = [];

    if (encrypted) {
      const decodeUrl =
        'https://script.google.com/macros/s/AKfycbxHbYHbrGMXYD2-bC-C43D3njIbU-wGiYQuJL61H4vyy6YVXkybMNNEPJNPPuZrD1gRVA/exec';

      const params = new URLSearchParams({
        encrypted_data: sources,
        nonce: nonce,
        secret: key[getKeyType],
      });

      const decodeRes = await axios.get(`${decodeUrl}?${params.toString()}`);
      videoSrc = JSON.parse(decodeRes.data.replace(/\n/g, ' ').match(/\\\[.*?\\\\]/)?.[0]);
      // console.log(`🔗 Video URL: ${videoUrl}`, decodeRes.data.match(/"file":"(.*?)"/));
    } else {
      videoSrc = sources;
    }
    return {
      sources: videoSrc,
      tracks: encryptedResData.tracks,
      intro: encryptedResData?.intro,
      outro: encryptedResData?.outro,
    };
  }
  // @ts-ignore
  const extract = async (embedIframeURL: PolyURL, referer = 'https://hianime.to'): Promise<ISource> => {
    const extractedData: ISource = {
      subtitles: [],
      intro: { start: 0, end: 0 },
      outro: { start: 0, end: 0 },
      sources: [],
    };
    // console.log(ctx);
    try {
      const resp = await getSources(embedIframeURL, referer);

      if (!resp) return extractedData;

      if (Array.isArray(resp.sources)) {
        // Process each source to extract quality information
        for (const s of resp.sources) {
          const isM3U8 = s.type === 'hls';

          // Add the main source with "auto" quality
          extractedData.sources.push({
            url: s.file,
            isM3U8,
            quality: 'auto',
          });

          // If it's an M3U8 file, fetch and parse quality variants
          if (isM3U8) {
            try {
              const m3u8Response = await fetch(s.file, {
                headers: {
                  'Referer': referer,
                  'User-Agent': USER_AGENT || 'Mozilla/5.0',
                },
              });
              const m3u8Content = await m3u8Response.text();
              if (m3u8Content.includes('EXTM3U')) {
                const pathWithoutMaster = s.file.split('/master.m3u8')[0] || s.file.split('/index.m3u8')[0];
                const videoList = m3u8Content.split('#EXT-X-STREAM-INF:');
                for (const video of videoList ?? []) {
                  if (!video.includes('m3u8')) continue;

                  const url = video.split('\n')[1]!.trim();
                  // Extract quality from RESOLUTION=WIDTHxHEIGHT
                  const resolutionMatch = video.match(/RESOLUTION=(\d+)x(\d+)/);
                  const quality = resolutionMatch ? resolutionMatch[2] : null;

                  // Check if URL is absolute or relative
                  const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
                  const finalUrl = isAbsoluteUrl ? url : `${pathWithoutMaster}/${url}`;

                  extractedData.sources.push({
                    url: finalUrl,
                    quality: quality ? `${quality}p` : 'auto',
                    isM3U8: url.includes('.m3u8'),
                  });
                }
              }
            } catch (error) {
              // If fetching M3U8 fails, just use the auto quality
              console.warn('[MegaCloud] Failed to fetch M3U8 variants:', error);
            }
          } else {
            // For non-M3U8 sources, keep as is
            extractedData.sources[extractedData.sources.length - 1] = {
              url: s.file,
              isM3U8: false,
              quality: 'default',
            };
          }
        }
      }

      extractedData.intro = resp.intro ?? extractedData.intro;
      extractedData.outro = resp.outro ?? extractedData.outro;

      extractedData.subtitles =
        resp.tracks?.map((track: { file: string; label?: string; kind: string }) => ({
          url: track.file,
          lang: track.label || track.kind,
        })) ?? [];

      // console.log(`[MegaCloud] Extracted ${extractedData.sources.length} source(s)`);

      return extractedData;
    } catch (err) {
      // console.error('[MegaCloud] Extraction error', err);
      throw err;
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}
