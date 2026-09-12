const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extracts MegaPlay stream from the provided embed URL.
 * Converted from Dart _extractMegaPlayStream.
 *
 * @param {string} url - The video/player URL
 * @param {string} quality - The video quality (e.g. 'auto', '1080p')
 * @param {string|null} [server] - Server name (default: 'Megaplay')
 * @param {object} [options] - Optional custom headers or settings
 * @returns {Promise<Array<{quality: string, url: string, server: string, backup: boolean, customHeaders: object, subtitle: string|null, subtitleFormat: string}>>}
 */
async function extractMegaPlayStream(url, quality = 'auto', server = 'Megaplay', options = {}) {
  const defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer':url,
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await axios.get(url, {
      headers: defaultHeaders,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  } catch (err) {
    console.error(`[Megaplay] Failed to fetch URL: ${err.message}`);
    return [];
  }

  if (!res || !res.data) {
    return [];
  }

  const $ = cheerio.load(res.data);
  console.log($.html())
  const playerDiv = $('#megaplay-player');

  if (!playerDiv.length) {
    console.log('[Megaplay] Couldnt find player div');
    return [];
  }

  const mediaId = playerDiv.attr('data-id');

  if (!mediaId) {
    console.log('[Megaplay] Couldnt find data-id');
    return [];
  }

  const reqHeaders = {
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://megaplay.buzz/',
    'User-Agent': defaultHeaders['User-Agent'],
  };

  const getSourcesUrl = 'https://megaplay.buzz/stream/getSources?id=';
  let sourcesJson = {};
  let defStreamUrl = null;

  try {
    const sourcesRes = await axios.get(`${getSourcesUrl}${mediaId}`, {
      headers: reqHeaders,
    });

    sourcesJson = typeof sourcesRes.data === 'string' ? JSON.parse(sourcesRes.data) : sourcesRes.data;
    defStreamUrl = sourcesJson?.sources?.file || (Array.isArray(sourcesJson?.sources) ? sourcesJson.sources[0]?.file : null);
  } catch (err) {
    console.log(`[Megaplay] Error fetching /getSources: ${err.message}`);
  }

  if (!defStreamUrl) {
    console.log('[Megaplay] No source file found from /getSources.');
  }

  // try again with a new url
  let newSourcesJson = {};
  let newStreamUrl = null;

  try {
    const newSourcesRes = await axios.get(`https://megaplay.buzz/stream/getSourcesNew?id=${mediaId}`, {
      headers: reqHeaders,
    });

    newSourcesJson = typeof newSourcesRes.data === 'string' ? JSON.parse(newSourcesRes.data) : newSourcesRes.data;
    newStreamUrl = newSourcesJson?.sources?.file || (Array.isArray(newSourcesJson?.sources) ? newSourcesJson.sources[0]?.file : null);
  } catch (err) {
    console.log(`[Megaplay] Error fetching /getSourcesNew: ${err.message}`);
  }

  if (!newStreamUrl) {
    console.log('[Megaplay] No source file found from /getSourcesNew.');
  }

  const streamUrl = defStreamUrl ?? newStreamUrl;

  if (!streamUrl) {
    return [];
  }

  const tracks = sourcesJson?.tracks || newSourcesJson?.tracks || [];
  const subs = Array.isArray(tracks) ? tracks : [];

  const engSub =
    subs.find((it) => it?.kind === 'captions' && (it?.label || '').toLowerCase() === 'english') ||
    subs.find((ite) => ite?.kind === 'captions' && ite?.default === true) ||
    {};

  if (!engSub || Object.keys(engSub).length === 0) {
    console.log('No subs available');
  }

  const cleanedSubLink = engSub?.file ? String(engSub.file).replace(/\\/g, '') : null;

  const formats = new Set(['srt', 'vtt', 'ass']);

  let subtitleFormat = null;
  if (cleanedSubLink) {
    try {
      const uri = new URL(cleanedSubLink);
      const pathSegments = uri.pathname.split('/').filter(Boolean);
      const fileName = pathSegments[pathSegments.length - 1];
      const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : null;
      subtitleFormat = formats.has(ext) ? ext : null;
    } catch {
      const fileName = cleanedSubLink.split('/').pop()?.split('?')[0];
      const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : null;
      subtitleFormat = formats.has(ext) ? ext : null;
    }
  }

  return [
    {
      quality: quality,
      url: streamUrl.replace(/\\/g, ''),
      server: server ?? 'Megaplay',
      backup: false,
      customHeaders: {
        Referer: 'https://megaplay.buzz/',
      },
      subtitle: cleanedSubLink,
      subtitleFormat: subtitleFormat ?? 'vtt',
    },
  ];
}

module.exports = {
  extractMegaPlayStream,
  _extractMegaPlayStream: extractMegaPlayStream,
};

// Allow running directly via CLI for testing: node text.js <url> [quality] [server]
if (require.main === module) {
  const args = process.argv.slice(2);
  const testUrl = args[0] || 'https://megaplay.buzz/stream/s-2/2142/sub?s=tcdn&autostart=true';
  const quality = args[1] || 'auto';
  const server = args[2] || 'Megaplay';

  console.log(`Running extraction for: ${testUrl}`);
  extractMegaPlayStream(testUrl, quality, server)
    .then((result) => {
      console.log('Result:', JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error('Error:', err);
    });
}
