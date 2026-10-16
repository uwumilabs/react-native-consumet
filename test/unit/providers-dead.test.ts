import * as Consumet from '../../src';
import { AnimeUnity } from '../../src/providers/anime/animeunity';
import ReadManga from '../../src/providers/manga/readmanga';

// PROV-3: dead providers are deleted, or flagged with `isWorking = false` and no longer exported.
const REMOVED = {
  ANIME: ['Anify', 'AnimeDrive', 'Marin', 'AnimeUnity', 'KickAssAnime', 'AnimeSuge', 'createAnimeSuge'],
  MANGA: ['ReadManga'],
  MOVIES: ['DramaCool'],
};

describe('dead providers (PROV-3)', () => {
  it.each(Object.entries(REMOVED).flatMap(([group, names]) => names.map((name) => [group, name])))(
    '%s.%s is not exported',
    (group, name) => {
      expect(Object.keys((Consumet as any)[group])).not.toContain(name);
    }
  );

  it('does not export the dead StreamP2P extractor', () => {
    expect(Object.keys(Consumet)).not.toContain('StreamP2P');
  });

  it.each([
    ['AnimeUnity', () => new AnimeUnity()],
    ['ReadManga', () => new ReadManga()],
  ])('flags %s as not working', (_name, create) => {
    const provider = create();
    expect(provider.isWorking).toBe(false);
    expect(provider.toString.isWorking).toBe(false);
  });

  it('exports only providers that are working', () => {
    const groups = ['ANIME', 'MANGA', 'LIGHT_NOVELS', 'MOVIES'] as const;
    for (const group of groups) {
      for (const [name, value] of Object.entries((Consumet as any)[group])) {
        if (typeof value !== 'function' || name.startsWith('create')) continue;
        const provider = new (value as new () => { isWorking: boolean })();
        expect({ provider: `${group}.${name}`, isWorking: provider.isWorking }).toEqual({
          provider: `${group}.${name}`,
          isWorking: true,
        });
      }
    }
  });
});
