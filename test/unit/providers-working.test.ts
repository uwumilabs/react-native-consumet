import * as Consumet from '../../src';

describe('exported providers (PROV-3)', () => {
  it('are all marked as working', () => {
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
