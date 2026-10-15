import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { MOVIES } from '../../src/providers';
import { TvType } from '../../src/models';
import { ProviderManager } from '../../src/utils/ProviderManager';
import registry from '../../src/extension-registry.json';

// Playback needs a verified session; unlocking one takes ~20-40s the first time.
jest.setTimeout(180000);

// run: yarn test --watch --verbose false netflixmirror.test.ts

const platforms = [
  { id: 'netflixmirror', provider: new MOVIES.NetflixMirror(), query: 'stranger things', series: 'Stranger Things' },
  { id: 'primemirror', provider: new MOVIES.PrimeMirror(), query: 'the boys', series: 'The Boys' },
  { id: 'disneymirror', provider: new MOVIES.DisneyMirror(), query: 'loki', series: 'Loki' },
];

describe.each(platforms)('$id', ({ provider, query, series }) => {
  let candidateIds: string[];
  let episodeId: string;

  test('search: returns results quickly, without waiting for a session', async () => {
    const started = Date.now();
    const data = await provider.search(query);
    expect(Date.now() - started).toBeLessThan(10000);

    candidateIds = data.results.filter((r) => r.title === series).map((r) => r.id);
    expect(candidateIds.length).toBeGreaterThan(0);
  });

  test('fetchMediaInfo: returns the series with episodes across seasons', async () => {
    // Prime also lists a same-named movie, and search results carry no type, so check each match.
    let info;
    for (const id of candidateIds) {
      info = await provider.fetchMediaInfo(id);
      if (info.type === TvType.TVSERIES) break;
    }
    expect(info!.title).toBe(series);
    expect(info!.type).toBe(TvType.TVSERIES);
    expect(new Set(info!.episodes!.map((e) => e.season)).size).toBeGreaterThan(1);
    episodeId = info!.episodes![0]!.id!;
  });

  test('fetchEpisodeSources: returns a real HLS stream, not the teaser', async () => {
    const data = await provider.fetchEpisodeSources(episodeId);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources[0]!.url).not.toContain('in=unknown');

    const master = await axios.get<string>(data.sources[0]!.url, { headers: data.headers, responseType: 'text' });
    expect(master.data).toContain('#EXTM3U');
    expect(master.data).not.toContain('220884');
  });
});

describe('registry: compiled dist loads each mirror from the shared file', () => {
  const manager = new ProviderManager(registry as any);
  const distFile = path.join(__dirname, '../../dist/providers/movies/netflixmirror/create-netflixmirror.js');

  test.each(platforms)('$id', async ({ id, query, series }) => {
    const metadata = registry.extensions.find((e) => e.id === id)!;
    expect(metadata).toBeDefined();

    const instance: any = await manager.executeProviderCode(
      fs.readFileSync(distFile, 'utf8'),
      metadata.factoryName,
      metadata as any
    );
    expect(instance.name).toBe(metadata.name);

    const data = await instance.search(query);
    expect(data.results.some((r: any) => r.title === series)).toBe(true);
  });
});
