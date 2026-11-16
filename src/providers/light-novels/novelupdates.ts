import type { AxiosRequestConfig } from 'axios';
import { load } from 'cheerio';

import {
  LightNovelParser,
  type ISearch,
  type ILightNovelInfo,
  type ILightNovelChapter,
  type ILightNovelChapterContent,
  type ILightNovelResult,
  type ProviderContext,
} from '../../models';
import { createProviderContext } from '../../utils/create-provider-context';
import { toMediaStatus } from '../common/media-status';

/** The page Cloudflare sends (with a 403 or 503) instead of the site's to clients it doesn't trust. */
const CLOUDFLARE_CHALLENGE = /<title>\s*(?:Just a moment\.\.\.|Attention Required! \| Cloudflare)\s*<\/title>/i;

/**
 * NovelUpdates (novelupdates.com), a directory of translated novels. It lists each chapter as a link
 * to the translator's own site, so it has no chapter text of its own.
 */
export class NovelUpdates extends LightNovelParser {
  override readonly name = 'NovelUpdates';
  protected override baseUrl = 'https://www.novelupdates.com';

  protected override logo = 'https://www.novelupdates.com/appicon.png';
  protected override classPath = 'LIGHT_NOVELS.NovelUpdates';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /** A page as text, through the context axios; Cloudflare's challenge fails with an error saying so. */
  private requestText = async (url: string, config: AxiosRequestConfig = {}): Promise<string> => {
    const response = await this.ctx.axios.request({ url, ...config, responseType: 'text' }).catch((err) => {
      if (CLOUDFLARE_CHALLENGE.test(String(err?.response?.data ?? ''))) return err.response;
      throw err;
    });
    const html = String(response.data ?? '');
    if (CLOUDFLARE_CHALLENGE.test(html)) throw new Error('NovelUpdates: Cloudflare blocked the request');
    return html;
  };

  /**
   * @param lightNovelUrl light novel URL or id
   * @param _chapterPage ignored: NovelUpdates lists every chapter in one request. Kept so existing calls compile.
   */
  override fetchLightNovelInfo = async (lightNovelUrl: string, _chapterPage?: number): Promise<ILightNovelInfo> => {
    if (!lightNovelUrl.startsWith(this.baseUrl)) {
      lightNovelUrl = `${this.baseUrl}/series/${lightNovelUrl}`;
    }
    const lightNovelInfo: ILightNovelInfo = {
      id: lightNovelUrl.split('/')?.pop()!,
      title: '',
      url: lightNovelUrl,
    };

    const $ = load(await this.requestText(lightNovelUrl));

    lightNovelInfo.title = $('div.seriestitlenu').text()?.trim();

    lightNovelInfo.image = $('div.seriesimg img').attr('src');
    lightNovelInfo.author = $('div#showauthors a').text();
    lightNovelInfo.genres = $('div#seriesgenre a')
      .map((i, el) => $(el).text())
      .get();
    lightNovelInfo.description = $('div#editdescription').text()?.trim();

    lightNovelInfo.status = toMediaStatus($('div#editstatus').text());

    const postId = $('input#mypostid').attr('value');

    lightNovelInfo.chapters = await this.fetchChapters(postId!);
    // `(4.3 / 5.0, 1234 votes)`: the average vote out of 5, doubled to a 10-point scale.
    lightNovelInfo.rating = Number($('h5.seriesother span.uvotes').text()?.split(' /')[0]?.substring(1) ?? 0) * 2;

    return lightNovelInfo;
  };
  private fetchChapters = async (postId: string): Promise<ILightNovelChapter[]> => {
    const chapters: ILightNovelChapter[] = [];

    const chapterData = await this.requestText(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      data: `action=nd_getchapters&mypostid=${postId}&mypostid2=0`,
    });

    const $ = load(chapterData);
    $('li.sp_li_chp a[data-id]').each((index, el) => {
      const id = $(el).attr('data-id');
      const title = $(el).find('span').text();

      chapters.push({
        id: id!,
        title: title!,
        url: `${this.baseUrl}/extnu/${id}`,
      });
    });

    return chapters;
  };

  /**
   * Not supported: a NovelUpdates chapter is a link (the chapter's `url`, which redirects) to the
   * translator's own site, whose pages differ from site to site. Always rejects; open the chapter's
   * `url` instead.
   */
  override fetchChapterContent = async (chapterId: string): Promise<ILightNovelChapterContent> => {
    throw new Error(
      `NovelUpdates: chapter ${chapterId} is on the translator's own site, so NovelUpdates has no text for it. Open its url instead.`
    );
  };

  override search = async (query: string): Promise<ISearch<ILightNovelResult>> => {
    const result: ISearch<ILightNovelResult> = { results: [] };

    const res = await this.requestText(`${this.baseUrl}/series-finder/?sf=1&sh=${encodeURIComponent(query)}`);

    const $ = load(res);

    $('div.search_main_box_nu').each((i, el) => {
      result.results.push({
        id: $(el).find('div.search_body_nu div.search_title a').attr('href')?.split('/series/')[1]!.split('/')[0]!,
        title: $(el).find('div.search_body_nu div.search_title a').text(),
        url: $(el).find('div.search_body_nu div.search_title a').attr('href')!,
        image: $(el).find('div.search_img_nu img').attr('src'),
      });
    });

    return result;
  };
}
