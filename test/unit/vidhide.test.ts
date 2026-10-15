import type { ISource } from '../../src/models';
import { VidHide } from '../../src/extractors/vidhide';
import { PolyURL } from '../../src/utils/url-polyfill';

// A VidHide embed page: the packed eval() call spans several lines before </script>.
const embedPage = `<!DOCTYPE html>
<html><body>
<div id="player"></div>
<script type='text/javascript'>eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c]);return p}
('0 1={2:"3"}',4,4,'var|player|file|master'.split('|')))
</script>
</body></html>`;

const unpacked = 'var player={sources:[{file:"https://cdn.example/hls/abc/master.m3u8?t=1"}]};';

const masterPlaylist = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=1280x720
index-v1-a1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1920x1080
index-v2-a1.m3u8
`;

describe('VidHide (PROV-1)', () => {
  it('finds a multi-line packed script and returns master and variant sources', async () => {
    const get = jest.fn().mockResolvedValueOnce({ data: embedPage }).mockResolvedValueOnce({ data: masterPlaylist });
    const deobfuscateScript = jest.fn().mockResolvedValue(unpacked);
    const ctx: any = { axios: { get }, USER_AGENT: 'test-agent', NativeConsumet: { deobfuscateScript } };

    const result = (await VidHide(ctx).extract(new PolyURL('https://vidhide.example/e/abc') as any)) as ISource;

    const packed: string = deobfuscateScript.mock.calls[0][0];
    expect(packed.startsWith('(function(p,a,c,k,e,d)')).toBe(true);
    expect(packed).not.toContain('</script>');

    expect(result.sources).toEqual([
      { quality: 'auto', url: 'https://cdn.example/hls/abc/master.m3u8?t=1', isM3U8: true },
      { quality: '720p', url: 'https://cdn.example/hls/abc/index-v1-a1.m3u8', isM3U8: true },
      { quality: '1080p', url: 'https://cdn.example/hls/abc/index-v2-a1.m3u8', isM3U8: true },
    ]);
  });

  it('reports a clear error when the page has no packed script', async () => {
    const ctx: any = {
      axios: { get: jest.fn().mockResolvedValue({ data: '<html><script>var x = 1;</script></html>' }) },
      USER_AGENT: 'test-agent',
      NativeConsumet: { deobfuscateScript: jest.fn() },
    };
    await expect(VidHide(ctx).extract(new PolyURL('https://vidhide.example/e/abc') as any)).rejects.toThrow(
      'No packed script found'
    );
  });
});
