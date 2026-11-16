import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { MOVIES } from '../../src/providers';
import { TvType } from '../../src/models';
import { ProviderManager } from '../../src/utils/ProviderManager';
import registry from '../../src/extension-registry.json';
import { expectMediaInfo, expectMediaSearch, expectSources } from '../unit/helpers/media-contract';

// Playback needs a verified session; unlocking one takes ~20-40s the first time.
jest.setTimeout(180000);

const platforms = [
  { id: 'netflixmirror', provider: new MOVIES.NetflixMirror(), query: 'stranger things', series: 'Stranger Things' },
  { id: 'primemirror', provider: new MOVIES.PrimeMirror(), query: 'the boys', series: 'The Boys' },
  { id: 'disneymirror', provider: new MOVIES.DisneyMirror(), query: 'loki', series: 'Loki' },
];

describe.each(platforms)('$id', ({ provider, query, series }) => {
  test('search, fetchMediaInfo and fetchEpisodeSources: plays the series, not the teaser', async () => {
    const started = Date.now();
    const data = await provider.search(query);
    // Search must not wait for the session unlock.
    expect(Date.now() - started).toBeLessThan(10000);
    expectMediaSearch(data);
    const candidateIds = data.results.filter((r) => r.title === series).map((r) => r.id);
    expect(candidateIds.length).toBeGreaterThan(0);

    // Prime also lists a same-named movie, so check each match.
    let info;
    for (const id of candidateIds) {
      info = await provider.fetchMediaInfo(id);
      if (info.type === TvType.TVSERIES) break;
    }
    expectMediaInfo(info);
    expect(info!.title).toBe(series);
    expect(info!.type).toBe(TvType.TVSERIES);
    expect(new Set(info!.episodes!.map((e) => e.season)).size).toBeGreaterThan(1);

    const sources = await provider.fetchEpisodeSources(info!.episodes![0]!.id!);
    expectSources(sources);
    expect(sources.sources[0]!.url).not.toContain('in=unknown');
    const master = await axios.get<string>(sources.sources[0]!.url, {
      headers: sources.headers,
      responseType: 'text',
    });
    expect(master.data).toContain('#EXTM3U');
    // The teaser stream's bandwidth
    expect(master.data).not.toContain('220884');
  });
});

describe('registry: compiled dist loads each mirror from the shared file', () => {
  const manager = new ProviderManager(registry as any);
  test.each(platforms)('$id', async ({ id, query, series }) => {
    const metadata = registry.extensions.find((e) => e.id === id)!;

    const instance: any = await manager.executeProviderCode(
      fs.readFileSync(path.join(__dirname, '../..', metadata.distFile!), 'utf8'),
      metadata as any
    );
    expect(instance.name).toBe(metadata.name);

    const data = await instance.search(query);
    expect(data.results.some((r: any) => r.title === series)).toBe(true);
  });
});
