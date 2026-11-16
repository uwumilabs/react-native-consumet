import { StreamWish } from '../../src/extractors/streamwish';
import { createExtractorContext } from '../../src/utils/create-extractor-context';

// A StreamWish embed page's player setup, packed with no words to replace. Its tracks list the
// seek-bar thumbnails next to the captions.
const player =
  'jwplayer("vplayer").setup({sources:[{file:"https://cdn.test/hls/master.m3u8?t=1"}],tracks:[' +
  '{file:"/dl?op=get_slides&length=1&url=https://cdn.test/thumbs.vtt",kind:"thumbnails"},' +
  '{file:"https://cdn.test/subs/eng.vtt",label:"English",kind:"captions"}]});';
const embedPage = `<html><script>eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c]);return p}('${player}',36,0,''.split('|')))</script></html>`;

describe('StreamWish', () => {
  it('returns the captions as subtitles, not the thumbnails track', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ data: embedPage })
      .mockResolvedValueOnce({ data: '#EXTM3U\n#EXTINF:10,\nseg-1.ts\n' });
    const ctx = createExtractorContext({ axios: { get } as any });

    const source = await StreamWish(ctx).extract('https://streamwish.test/e/abc');

    expect(source.subtitles).toEqual([{ lang: 'English', url: 'https://cdn.test/subs/eng.vtt' }]);
    expect(source.sources).toEqual([
      { quality: 'default', url: 'https://cdn.test/hls/master.m3u8?t=1&i=0.4', isM3U8: true },
    ]);
  });
});
