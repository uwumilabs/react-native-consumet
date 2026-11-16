"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unwrapFastDlUrl = void 0;
exports.HubCloud = HubCloud;
const file_hosts_1 = require("./file-hosts");
const gofile_1 = require("./gofile");
const url_1 = require("./url");
/** `value` decoded from base64, or '' when it isn't base64 (or `atob` is missing, on older React Native). */
function decodeBase64(value) {
  try {
    return atob(value);
  } catch {
    return '';
  }
}
/** The next page's URL, which the page's script holds as `atob(atob('…'))` or as `var url = '…r=<base64>'`. */
function extractUrlFromScript(html) {
  const doubleEncoded = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/)?.[1];
  if (doubleEncoded) return decodeBase64(decodeBase64(doubleEncoded));
  const plain = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/)?.[1];
  return decodeBase64(plain?.split('r=')?.[1] ?? '') || plain || '';
}
/** FastDL's dl.php?link=<url> is an HTML "Download Now" page; the file is the URL it wraps. */
const unwrapFastDlUrl = url => {
  const wrapped = url.match(/\/dl\.php\?link=(.+)$/)?.[1];
  if (!wrapped) return url;
  return /^https?%3A/i.test(wrapped) ? decodeURIComponent(wrapped) : wrapped;
};
exports.unwrapFastDlUrl = unwrapFastDlUrl;
/** The PixelDrain URL a page's script sends the browser to (`var pxl = '…'`), from the first page that has one. */
const pixelDrainRedirect = function () {
  for (var _len = arguments.length, pages = new Array(_len), _key = 0; _key < _len; _key++) {
    pages[_key] = arguments[_key];
  }
  return pages.map(html => html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i)?.[1]).find(Boolean) ?? '';
};
function parseSizeInBytes(text) {
  const match = text.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return undefined;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return Math.round(val * 1024 * 1024 * 1024);
  if (unit === 'MB') return Math.round(val * 1024 * 1024);
  if (unit === 'KB') return Math.round(val * 1024);
  return Math.round(val);
}
/** Sources are listed fastest host first. */
function hostPriority() {
  let serverName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  const s = serverName.toLowerCase();
  if (s.includes('cf storage') || s.includes('storage')) return 1;
  if (s.includes('cf worker') || s.includes('worker') || s.includes('fast cloud')) return 2;
  if (s.includes('gofile')) return 3;
  if (s.includes('pixeldrain')) return 4;
  if (s.includes('fastdl') || s.includes('fsl')) return 5;
  if (s.includes('hubcdn')) return 6;
  if (s.includes('gdrive') || s.includes('google')) return 7;
  return 10;
}
function HubCloud(ctx) {
  const {
    axios,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  const extract = async (videoUrl, referer) => {
    const url = (0, url_1.toUrl)(PolyURL, videoUrl);
    const baseUrl = url.origin;
    const pageHeaders = {
      'User-Agent': USER_AGENT,
      'Referer': referer || baseUrl
    };
    const {
      data: firstPage
    } = await axios.get(url.href, {
      headers: pageHeaders
    });
    const $first = load(firstPage);
    let pageQuality = (0, file_hosts_1.qualityIn)($first('title').text()) || (0, file_hosts_1.qualityIn)($first('.card-header').text()) || (0, file_hosts_1.qualityIn)(url.href) || 'auto';
    let fileSize = parseSizeInBytes($first('#size, .list-group-item:contains("Size")').text());
    const sources = [];
    const addGofileSources = res => {
      for (const s of res.sources) {
        if (sources.some(item => item.url === s.url)) continue;
        sources.push({
          ...s,
          server: 'Gofile',
          quality: pageQuality !== 'auto' ? pageQuality : s.quality || 'auto',
          size: s.size || fileSize
        });
      }
    };
    const tryGofile = async link => {
      try {
        addGofileSources(await (0, gofile_1.Gofile)(ctx).extract(link));
      } catch {
        // A Gofile link that fails leaves the other hosts' sources.
      }
    };
    for (const el of $first("a[href*='gofile.io']").toArray()) {
      const href = $first(el).attr('href');
      if (href) await tryGofile(href);
    }
    let vcloudLink = extractUrlFromScript(firstPage) || $first('.fa-file-download.fa-lg').parent().attr('href') || url.href;
    if (vcloudLink.startsWith('/')) vcloudLink = `${baseUrl}${vcloudLink}`;
    if (vcloudLink.includes('gofile.io')) await tryGofile(vcloudLink);
    let vcloudPage = '';
    if (!vcloudLink.includes('gofile.io') && vcloudLink !== url.href) {
      vcloudPage = (await axios.get(vcloudLink, {
        headers: pageHeaders
      })).data;
    }
    const $ = load(vcloudPage || firstPage);
    if (pageQuality === 'auto') {
      pageQuality = (0, file_hosts_1.qualityIn)($('title').text()) || (0, file_hosts_1.qualityIn)($('.card-header').text()) || (0, file_hosts_1.qualityIn)(vcloudLink) || 'auto';
    }
    if (!fileSize) fileSize = parseSizeInBytes($('#size, .list-group-item:contains("Size")').text());
    const add = (link, server) => sources.push({
      url: link,
      server,
      quality: pageQuality,
      isM3U8: link.includes('.m3u8'),
      size: fileSize
    });
    for (const element of $('.btn-success.btn-lg.h6, .btn-danger, .btn-secondary').toArray()) {
      let btnUrl = $(element).attr('href') || '';
      try {
        switch (true) {
          case btnUrl.includes('pixeld'):
            if (!btnUrl.includes('api')) {
              btnUrl = pixelDrainRedirect(firstPage, vcloudPage) || btnUrl;
              const token = btnUrl.split('/').pop()?.split('?')[0];
              btnUrl = `${btnUrl.split('/').slice(0, -2).join('/')}/api/file/${token}?download`;
            }
            add(btnUrl, 'Pixeldrain');
            break;
          case btnUrl.includes('.dev') && !btnUrl.includes('/?id='):
            add(btnUrl, 'CF Worker');
            break;
          case btnUrl.includes('hubcloud') || btnUrl.includes('/?id='):
            {
              // The button redirects to the Google Drive file, sometimes through a `?link=<url>` page.
              const res = await axios.get(btnUrl, {
                headers: pageHeaders,
                validateStatus: () => true
              });
              const redirected = (0, file_hosts_1.finalUrl)(res, btnUrl);
              add(redirected.includes('?link=') ? redirected.split('?link=')[1] || redirected : redirected, 'GDrive (download only)');
              break;
            }
          case btnUrl.includes('gofile.io'):
            addGofileSources(await (0, gofile_1.Gofile)(ctx).extract(btnUrl));
            break;
          case btnUrl.includes('cloudflarestorage'):
            add(btnUrl, 'CF Storage');
            break;
          case btnUrl.includes('fastdl') || btnUrl.includes('fsl.'):
            sources.push({
              url: (0, exports.unwrapFastDlUrl)(btnUrl),
              server: 'FastDl',
              quality: pageQuality,
              isM3U8: btnUrl.includes('.m3u8'),
              size: fileSize
            });
            break;
          case btnUrl.includes('hubcdn') && !btnUrl.includes('/?id='):
            add(btnUrl, 'HubCdn');
            break;
          default:
            if (['.m3u8', '.mp4', '.mkv', '?token='].some(part => btnUrl.includes(part))) add(btnUrl, 'CF Worker');
            break;
        }
      } catch {
        // Each button is a different host; one that fails leaves the others' sources.
      }
    }
    sources.sort((a, b) => hostPriority(a.server || a.quality) - hostPriority(b.server || b.quality));
    return {
      sources,
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': baseUrl
      }
    };
  };
  return {
    extract
  };
}
//# sourceMappingURL=hubcloud.js.map