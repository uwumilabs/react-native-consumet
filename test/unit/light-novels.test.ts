import { NovelUpdates } from '../../src/providers/light-novels/novelupdates';
import { ReadLightNovels } from '../../src/providers/light-novels/readlightnovels';
import { createProviderContext } from '../../src/utils/create-provider-context';

const context = (axios: object) => ({ ...createProviderContext(), axios: axios as any });

// The start of the page Cloudflare answered https://www.novelupdates.com/series/... with on 2026-11-16 (403).
const CHALLENGE = '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title></head><body></body></html>';

describe('NovelUpdates', () => {
  it('requests the site itself and says so when Cloudflare blocks it', async () => {
    const request = jest.fn().mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), { response: { status: 403, data: CHALLENGE } })
    );
    const novelUpdates = new NovelUpdates(context({ request }));

    await expect(novelUpdates.search('slime')).rejects.toThrow('NovelUpdates: Cloudflare blocked the request');
    await expect(novelUpdates.fetchLightNovelInfo('tensei-shitara-slime-datta-ken')).rejects.toThrow(
      'NovelUpdates: Cloudflare blocked the request'
    );
    expect(request.mock.calls.map(([config]) => config.url)).toEqual([
      'https://www.novelupdates.com/series-finder/?sf=1&sh=slime',
      'https://www.novelupdates.com/series/tensei-shitara-slime-datta-ken',
    ]);
  });

  it('passes other failures on', async () => {
    const failure = new Error('socket hang up');
    const novelUpdates = new NovelUpdates(context({ request: jest.fn().mockRejectedValue(failure) }));

    await expect(novelUpdates.search('slime')).rejects.toBe(failure);
  });

  it('has no chapter text: chapters are on the translators’ own sites', async () => {
    const request = jest.fn();
    const novelUpdates = new NovelUpdates(context({ request }));

    await expect(novelUpdates.fetchChapterContent('6659442')).rejects.toThrow("translator's own site");
    expect(request).not.toHaveBeenCalled();
  });
});

describe('ReadLightNovels', () => {
  it('lists the chapters of a novel whose chapters fit on one page (no pagination)', async () => {
    const page = '<input id="id_post" value="42"><div class="col-xs-12 col-sm-8 col-md-8 desc"><h3>Novel</h3></div>';
    const list = '<ul class="list-chapter"><li><a href="https://readlightnovels.net/novel/chapter-1.html"><span>Chapter 1</span></a></li></ul>';
    const axios = Object.assign(jest.fn().mockResolvedValue({ data: { list_chap: list } }), {
      get: jest.fn().mockResolvedValue({ data: page }),
    });

    const info = await new ReadLightNovels(context(axios)).fetchLightNovelInfo('novel');

    expect(info.pages).toBe(1);
    expect(info.chapters).toEqual([
      { id: 'novel/chapter-1', title: 'Chapter 1', url: 'https://readlightnovels.net/novel/chapter-1.html' },
    ]);
    expect(axios).toHaveBeenCalledTimes(1);
  });
});
