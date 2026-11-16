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
  MediaStatus,
} from '../../models';
import { createProviderContext } from '../../utils/create-provider-context';
import { toMediaStatus } from '../common/media-status';

export class NovelUpdates extends LightNovelParser {
  override readonly name = 'NovelUpdates';
  protected override baseUrl = 'https://www.novelupdates.com';

  private proxyURL = 'http://translate.google.com/translate?sl=ja&tl=en&u=';

  protected override logo = 'https://www.novelupdates.com/appicon.png';
  protected override classPath = 'LIGHT_NOVELS.NovelUpdates';

  /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
  constructor(private readonly ctx: ProviderContext = createProviderContext()) {
    super();
  }

  /** Requests a page as text through the context axios. */
  private requestText = async (url: string, config: AxiosRequestConfig = {}): Promise<string> => {
    const { data } = await this.ctx.axios.request({ url, ...config, responseType: 'text' });
    return data;
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

    const page = await this.requestText(`${this.proxyURL}${encodeURIComponent(lightNovelUrl)}`, {
      headers: {
        Referer: lightNovelUrl,
      },
    });

    const $ = load(page);

    if ($('title').html() === 'Just a moment...' || $('title').html() === 'Attention Required! | Cloudflare') {
      throw new Error('NovelUpdates: Cloudflare blocked the request');
    }

    lightNovelInfo.title = $('div.seriestitlenu').text()?.trim();

    lightNovelInfo.image = $('div.seriesimg img').attr('src');
    lightNovelInfo.author = $('div#showauthors a').text();
    lightNovelInfo.genres = $('div#seriesgenre a')
      .map((i, el) => $(el).text())
      .get();
    lightNovelInfo.description = $('div#editdescription').text()?.trim();

    lightNovelInfo.status = toMediaStatus($('div#editstatus').text(), MediaStatus);

    const postId = $('input#mypostid').attr('value');

    lightNovelInfo.chapters = await this.fetchChapters(postId!);
    // The average vote out of 5, doubled to a 10-point scale.
    lightNovelInfo.rating = Number($('h5.seriesother span.uvotes').text()?.split(' /')[0]?.substring(1) ?? 0) * 2;

    return lightNovelInfo;
  };
  private fetchChapters = async (postId: string): Promise<ILightNovelChapter[]> => {
    const chapters: ILightNovelChapter[] = [];

    const chapterData = (
      await this.requestText(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': '_ga=;',
        },
        data: `action=nd_getchapters&mypostid=${postId}&mypostid2=0`,
      })
    ).substring(1);

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

  /** @param chapterId chapter id or URL */
  override fetchChapterContent = async (chapterId: string): Promise<ILightNovelChapterContent> => {
    if (!chapterId.startsWith(this.baseUrl)) {
      chapterId = `${this.baseUrl}/extnu/${chapterId}`;
    }
    const contents: ILightNovelChapterContent = {
      novelTitle: '',
      chapterTitle: '',
      text: '',
    };

    const data = await this.requestText(`${this.proxyURL}${encodeURIComponent(chapterId)}`);

    const $ = load(data);

    contents.novelTitle = $('title').text();
    contents.chapterTitle = $('title').text();

    contents.text = data;

    return contents;
  };

  override search = async (query: string): Promise<ISearch<ILightNovelResult>> => {
    const result: ISearch<ILightNovelResult> = { results: [] };

    const res = await this.requestText(
      `${this.proxyURL}${encodeURIComponent(`${this.baseUrl}/series-finder/?sf=1&sh=${encodeURIComponent(query)}`)}`,
      {
        headers: {
          Referer: this.baseUrl,
        },
      }
    );

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
