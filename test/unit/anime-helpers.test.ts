import { load } from 'cheerio';
import { hlsVariants } from '../../src/extractors/hls';
import { unpackScripts } from '../../src/extractors/packer';
import { serverName } from '../../src/providers/anime/helpers';
import { cardPage, pageUrl, siteEpisodeId, toEpisodeId } from '../../src/providers/anime/hianime';

describe('hlsVariants', () => {
  const MASTER = 'https://cdn.test/hls/abc/master.m3u8?t=1';

  it('resolves absolute, root-relative and relative variant URIs against the master', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=1,RESOLUTION=1920x1080',
      'https://other.test/1080.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=2,RESOLUTION=1280x720',
      '/root/720.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=3',
      'low/index.m3u8',
      '',
    ].join('\r\n');

    expect(hlsVariants(playlist, MASTER)).toEqual([
      { url: 'https://other.test/1080.m3u8', isM3U8: true, quality: '1080p' },
      { url: 'https://cdn.test/root/720.m3u8', isM3U8: true, quality: '720p' },
      { url: 'https://cdn.test/hls/abc/low/index.m3u8', isM3U8: true, quality: 'quality_3' },
    ]);
  });

  it('lists no variants for a media playlist or for one that is not text', () => {
    expect(hlsVariants('#EXTM3U\n#EXTINF:10,\nseg-1.ts\n', MASTER)).toEqual([]);
    expect(hlsVariants({ error: 'not found' }, MASTER)).toEqual([]);
  });
});

describe('unpackScripts', () => {
  it('unpacks every packed block in page order', () => {
    const packed = (payload: string, words: string) =>
      `<script>eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c]);return p}('${payload}',36,${words.split('|').length},'${words}'.split('|')))</script>`;
    const html = packed('0 1=2', 'var|a|one') + packed('0("1")', 'play|https://cdn.test/v.m3u8');

    expect(unpackScripts(html)).toEqual(['var a=one', 'play("https://cdn.test/v.m3u8")']);
    expect(unpackScripts('<script>var x = 1;</script>')).toEqual([]);
  });
});

describe('hianime-style listings', () => {
  const card = { id: 'one-piece-100', title: 'One Piece' };
  const pagination = (active: number, linked: number[]) =>
    load(
      `<ul class="pagination">${linked
        .map((page) =>
          page === active
            ? `<li class="page-item active"><a class="page-link">${page}</a></li>`
            : `<li class="page-item"><a class="page-link" href="/tv?page=${page}">${page}</a></li>`
        )
        .join('')}</ul>`
    );

  it('reads the current, last and next page from the pagination links', () => {
    expect(cardPage(pagination(2, [1, 2, 3, 40]), [card], 2)).toEqual({
      currentPage: 2,
      hasNextPage: true,
      totalPages: 40,
      results: [card],
    });
    expect(cardPage(pagination(40, [38, 39, 40]), [card], 40)).toMatchObject({ hasNextPage: false, totalPages: 40 });
  });

  it('treats a listing without pagination as the one page asked for, and no cards as an empty page', () => {
    expect(cardPage(load('<div></div>'), [card], 0)).toEqual({
      currentPage: 1,
      hasNextPage: false,
      totalPages: 1,
      results: [card],
    });
    expect(cardPage(pagination(1, [1, 2]), [], 3)).toEqual({ currentPage: 3, hasNextPage: false, results: [] });
  });

  it('asks for the first page for page numbers below 1', () => {
    expect(pageUrl('https://site.test/tv', 0)).toBe('https://site.test/tv?page=1');
    expect(pageUrl('https://site.test/search?keyword=a', 2)).toBe('https://site.test/search?keyword=a&page=2');
  });

  it('builds and reads $episode$ ids', () => {
    expect(toEpisodeId('one-piece-100', '2142')).toBe('one-piece-100$episode$2142');
    expect(siteEpisodeId('one-piece-100$episode$2142$both')).toBe('2142');
    expect(siteEpisodeId('2142')).toBeUndefined();
  });
});

describe('serverName', () => {
  it('starts with the extractor and lower-cases the label, spaces as dashes', () => {
    expect(serverName('vidhide', ' Server 1-hardsub ')).toBe('vidhide-server-1-hardsub');
    expect(serverName('megacloud', 'HD-1')).toBe('megacloud-hd-1');
  });
});
