import { SubOrDub } from '../../src/models';
import { createAniKoto } from '../../src/providers/anime/anikoto/create-anikoto';
import { createMultiMovies } from '../../src/providers/movies/multimovies/create-multimovies';
import { createVegaMovies } from '../../src/providers/movies/vegamovies/create-vegamovies';
import { createProviderContext } from '../../src/utils/create-provider-context';

describe('AniKoto servers', () => {
  const aniKoto = (serverList: string) => {
    const get = jest.fn(async (url: string) => {
      if (url.includes('/ajax/server/list')) return { data: { result: serverList } };
      const linkId = /get=([^&]+)/.exec(url)?.[1];
      if (linkId) return { data: { result: { url: `https://megaplay.example/stream/${linkId}` } } };
      throw new Error(`unexpected request ${url}`);
    });
    return createAniKoto({ ...createProviderContext(), axios: { get } as any });
  };

  it('lists no dub servers when the dub group is empty, rather than the sub ones', async () => {
    const provider = aniKoto(`<div class="servers">
      <div class="type" data-type="sub"><ul><li data-link-id="s1">Server 1</li></ul></div>
      <div class="type" data-type="dub"><ul></ul></div>
    </div>`);
    expect(await provider.fetchEpisodeServers('show$episode$1', SubOrDub.DUB)).toEqual([]);
    expect(await provider.fetchEpisodeServers('show$episode$1', SubOrDub.SUB)).toEqual([
      { name: 'megaplay-server-1', url: 'https://megaplay.example/stream/s1' },
    ]);
  });

  it('lists every server of a list without language groups', async () => {
    const provider = aniKoto('<div class="servers"><ul><li data-link-id="s1">HD 1</li><li data-link-id="s2">HD 2</li></ul></div>');
    const servers = await provider.fetchEpisodeServers('show$episode$1', SubOrDub.DUB);
    expect(servers.map((s) => s.name)).toEqual(['megaplay-hd-1', 'megaplay-hd-2']);
  });
});

describe('VegaMovies servers', () => {
  const PAGE = 'https://hubcloud.example/drive/abc';
  const GOFILE_PAGE = 'https://gofile.io/d/abc';
  const GOFILE_FILE = 'https://store1.gofile.io/download/web/abc/film.mkv';
  const PIXELDRAIN = 'https://pixeldrain.example/api/file/x?download';

  const vegaMovies = () => {
    const hubCloud = jest.fn(async () => ({
      sources: [
        { url: PIXELDRAIN, server: 'Pixeldrain', quality: '1080p', isM3U8: false },
        { url: GOFILE_PAGE, server: 'Gofile', quality: '1080p', isM3U8: false, size: 5 },
      ],
      headers: { Referer: 'https://hubcloud.example' },
    }));
    const gofile = jest.fn(async () => ({ sources: [{ url: GOFILE_FILE, quality: 'auto', isM3U8: false }] }));
    const ctx = createProviderContext({
      extractors: { HubCloud: () => ({ extract: hubCloud }), Gofile: () => ({ extract: gofile }) },
    });
    return { provider: createVegaMovies(ctx), gofile };
  };

  it("names a HubCloud page's servers after it, without reading the Gofile page", async () => {
    const { provider, gofile } = vegaMovies();
    expect(await provider.fetchEpisodeServers(PAGE)).toEqual([
      { name: 'hubcloud-pixeldrain', url: PIXELDRAIN },
      { name: 'hubcloud-gofile', url: GOFILE_PAGE },
      { name: 'hubcloud', url: PAGE },
    ]);
    expect(gofile).not.toHaveBeenCalled();
  });

  it('reads Gofile pages with the Gofile extractor and lists the server asked for first', async () => {
    const { provider } = vegaMovies();
    const { sources, headers } = await provider.fetchEpisodeSources(PAGE, undefined, 'hubcloud-gofile');
    expect(sources).toEqual([
      { url: GOFILE_FILE, server: 'hubcloud-gofile', quality: '1080p', isM3U8: false, size: 5 },
      { url: PIXELDRAIN, server: 'hubcloud-pixeldrain', quality: '1080p', isM3U8: false },
    ]);
    expect(headers).toEqual({ Referer: 'https://hubcloud.example' });
  });
});

describe('MultiMovies search', () => {
  const BASE = 'https://multimovies.center';
  const result = (path: string) =>
    `<div class="result-item"><article><div class="thumbnail"><a href="${BASE}/${path}/"></a></div>` +
    `<div class="details"><div class="title"><a>${path}</a></div></div></article></div>`;
  const season = (n: number) =>
    `<div class="se-c"><span class="se-t">${n}</span><ul class="episodios"><li><div class="numerando">${n} - 1</div>` +
    `<div class="episodiotitle"><a href="${BASE}/episodes/show-${n}x1/">E1</a></div></li></ul></div>`;

  it("counts only series' seasons, and a page that fails leaves the count out", async () => {
    const get = jest.fn(async (url: string) => {
      if (url.includes('?s=')) {
        return { data: `<div class="search-page">${result('tvshows/good')}${result('tvshows/broken')}${result('movies/film')}</div>` };
      }
      if (url === `${BASE}/tvshows/good`) return { data: `<div id="seasons">${season(1)}${season(2)}</div>` };
      throw new Error(`unexpected request ${url}`);
    });
    const provider = createMultiMovies({ ...createProviderContext(), axios: { get } as any });

    const { results } = await provider.search('query');

    expect(results.map((r) => [r.id, r.seasons])).toEqual([
      ['tvshows/good', 2],
      ['tvshows/broken', undefined],
      ['movies/film', undefined],
    ]);
    expect(get.mock.calls.map(([url]) => url)).not.toContain(`${BASE}/movies/film`);
  });
});
