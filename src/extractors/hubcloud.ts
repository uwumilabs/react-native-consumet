import { type ExtractorContext, type ISource, type IVideo } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
import { finalUrl, isFastDl, isGofilePage, qualityIn, unwrapFastDlUrl } from './file-hosts';
import { toUrl } from './url';

/** The PixelDrain URL a page's script sends the browser to (`var pxl = '…'`), from the first page that has one. */
const pixelDrainRedirect = (...pages: string[]): string =>
  pages.map((html) => html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i)?.[1]).find(Boolean) ?? '';

function parseSizeInBytes(text: string): number | undefined {
  const match = text.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return undefined;
  const val = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  if (unit === 'GB') return Math.round(val * 1024 * 1024 * 1024);
  if (unit === 'MB') return Math.round(val * 1024 * 1024);
  if (unit === 'KB') return Math.round(val * 1024);
  return Math.round(val);
}

/** Sources are listed fastest host first. */
function hostPriority(server: string = ''): number {
  const s = server.toLowerCase();
  if (s.includes('cf storage') || s.includes('storage')) return 1;
  if (s.includes('cf worker') || s.includes('worker') || s.includes('fast cloud')) return 2;
  if (s.includes('gofile')) return 3;
  if (s.includes('pixeldrain')) return 4;
  if (s.includes('fastdl') || s.includes('fsl')) return 5;
  if (s.includes('hubcdn')) return 6;
  if (s.includes('gdrive') || s.includes('google')) return 7;
  return 10;
}

/**
 * HubCloud, which also reads V-Cloud pages: the file's hosts, as one source each, fastest first.
 * A Gofile host is listed as its Gofile page (server `Gofile`): run the Gofile extractor on it for
 * the file.
 */
export function HubCloud(ctx: ExtractorContext) {
  const { axios, load, CryptoJS, USER_AGENT, PolyURL } = ctx;

  /**
   * `value` decoded from base64 (as `atob` would), or '' when it isn't base64. Not `atob` itself,
   * which older React Native versions lack.
   */
  function decodeBase64(value: string): string {
    let base64 = value.replace(/\s+/g, '');
    if (base64.length % 4 === 0) base64 = base64.replace(/[=]{1,2}$/, '');
    if (base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*$/.test(base64)) return '';
    return CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Latin1);
  }

  /** The next page's URL, which the page's script holds as `atob(atob('…'))` or as `var url = '…r=<base64>'`. */
  function extractUrlFromScript(html: string): string {
    const doubleEncoded = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/)?.[1];
    if (doubleEncoded) return decodeBase64(decodeBase64(doubleEncoded));
    const plain = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/)?.[1];
    return decodeBase64(plain?.split('r=')?.[1] ?? '') || plain || '';
  }

  const extract = async (videoUrl: string | PolyURL, referer?: string): Promise<ISource> => {
    const url = toUrl(PolyURL, videoUrl);
    const baseUrl = url.origin;
    const pageHeaders = { 'User-Agent': USER_AGENT, 'Referer': referer || baseUrl };

    const { data: firstPage } = await axios.get(url.href, { headers: pageHeaders });
    const $first = load(firstPage);

    let pageQuality =
      qualityIn($first('title').text()) || qualityIn($first('.card-header').text()) || qualityIn(url.href) || 'auto';
    let fileSize = parseSizeInBytes($first('#size, .list-group-item:contains("Size")').text());

    const gofilePages = $first("a[href*='gofile.io']")
      .toArray()
      .map((el) => $first(el).attr('href'))
      .filter((href): href is string => Boolean(href));

    let vcloudLink =
      extractUrlFromScript(firstPage) || $first('.fa-file-download.fa-lg').parent().attr('href') || url.href;
    if (vcloudLink.startsWith('/')) vcloudLink = `${baseUrl}${vcloudLink}`;

    let vcloudPage = '';
    if (isGofilePage(vcloudLink)) gofilePages.push(vcloudLink);
    else if (vcloudLink !== url.href) vcloudPage = (await axios.get(vcloudLink, { headers: pageHeaders })).data;

    const $ = load(vcloudPage || firstPage);
    if (pageQuality === 'auto') {
      pageQuality =
        qualityIn($('title').text()) || qualityIn($('.card-header').text()) || qualityIn(vcloudLink) || 'auto';
    }
    if (!fileSize) fileSize = parseSizeInBytes($('#size, .list-group-item:contains("Size")').text());

    const sources: IVideo[] = [];
    const add = (link: string, server: string) => {
      if (sources.some((source) => source.url === link)) return;
      sources.push({ url: link, server, quality: pageQuality, isM3U8: link.includes('.m3u8'), size: fileSize });
    };

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

          case btnUrl.includes('hubcloud') || btnUrl.includes('/?id='): {
            // The button redirects to the Google Drive file, sometimes through a `?link=<url>` page.
            const res = await axios.get(btnUrl, { headers: pageHeaders, validateStatus: () => true });
            const redirected = finalUrl(res, btnUrl);
            add(
              redirected.includes('?link=') ? redirected.split('?link=')[1] || redirected : redirected,
              'GDrive (download only)'
            );
            break;
          }

          case isGofilePage(btnUrl):
            gofilePages.push(btnUrl);
            break;

          case btnUrl.includes('cloudflarestorage'):
            add(btnUrl, 'CF Storage');
            break;

          case isFastDl(btnUrl):
            add(unwrapFastDlUrl(btnUrl), 'FastDl');
            break;

          case btnUrl.includes('hubcdn') && !btnUrl.includes('/?id='):
            add(btnUrl, 'HubCdn');
            break;

          default:
            if (['.m3u8', '.mp4', '.mkv', '?token='].some((part) => btnUrl.includes(part))) add(btnUrl, 'CF Worker');
            break;
        }
      } catch {
        // Each button is a different host; one that fails leaves the others' sources.
      }
    }

    for (const page of gofilePages) add(page, 'Gofile');
    sources.sort((a, b) => hostPriority(a.server) - hostPriority(b.server));

    return { sources, headers: { 'User-Agent': USER_AGENT, 'Referer': baseUrl } };
  };

  return { extract };
}
