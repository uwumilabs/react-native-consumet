import Anilist from '../../src/providers/meta/anilist';
import Myanimelist from '../../src/providers/meta/mal';
import { bestTitleMatch } from '../../src/providers/meta/shared';
import { metaHttp } from '../../src/utils/meta-http';
import { normalizeTitle, searchTerm } from '../../src/utils/utils';
import soloLeveling from './fixtures/anilist/manga-105398.json';
import { replayAlways } from './fixtures/anilist/replay';

afterEach(() => jest.restoreAllMocks());

describe('normalizeTitle and searchTerm', () => {
  it('keep letters of every script', () => {
    expect(searchTerm('Pokémon: XY')).toBe('Pokémon XY');
    expect(normalizeTitle('Pokémon: XY')).toBe('pokémon xy');
    expect(normalizeTitle('進撃の巨人 (Season 2)')).toBe('進撃の巨人 season 2');
    expect(normalizeTitle('Ёлки-палки')).toBe('ёлки палки');
  });

  it('drop apostrophes and turn other punctuation into spaces', () => {
    expect(normalizeTitle("  A Returner's Magic Should Be Special!! ")).toBe('a returners magic should be special');
    expect(searchTerm('Re:Zero kara')).toBe('Re Zero kara');
  });
});

describe('bestTitleMatch', () => {
  const results = [
    { id: 'pokemon-xy', title: 'Pokémon XY' },
    { id: 'pokemon', title: 'Pokémon' },
    { id: 'digimon', title: 'Digimon Adventure' },
  ];

  it('picks the closest title of any wanted title, accents included', () => {
    expect(bestTitleMatch(['Pocket Monsters', 'Pokémon'], results, 0.6)?.id).toBe('pokemon');
  });

  it('gives nothing when no title is close enough', () => {
    expect(bestTitleMatch(['Yu-Gi-Oh!'], results, 0.6)).toBeUndefined();
  });

  it('compares alt titles, japaneseTitle and every name of an ITitle', () => {
    const titled = [
      { id: 'alt', title: 'Solo Leveling', altTitles: ['Na Honjaman Level Up'] },
      { id: 'japanese', title: 'Attack on Titan', japaneseTitle: 'Shingeki no Kyojin' },
      { id: 'ititle', title: { english: 'Frieren', romaji: 'Sousou no Frieren' } },
    ];
    expect(bestTitleMatch(['Na Honjaman Level Up'], titled, 0.9)?.id).toBe('alt');
    expect(bestTitleMatch(['Shingeki no Kyojin'], titled, 0.9)?.id).toBe('japanese');
    expect(bestTitleMatch(['Sousou no Frieren'], titled, 0.9)?.id).toBe('ititle');
  });

  it('never matches titles that are only punctuation', () => {
    expect(bestTitleMatch(['!!!'], [{ id: 'x', title: '???' }], 0.5)).toBeUndefined();
  });

  it('orders close results with the caller rule, ties keeping the provider order', () => {
    const twins = [
      { id: 'first', title: 'Naruto', year: 2002 },
      { id: 'second', title: 'Naruto', year: 2007 },
    ];
    expect(bestTitleMatch(['Naruto'], twins, 0.5)?.id).toBe('first');
    expect(
      bestTitleMatch(['Naruto'], twins, 0.5, {
        compare: (a, b) => b.similarity - a.similarity || b.result.year - a.result.year,
      })?.id
    ).toBe('second');
  });
});

describe('Myanimelist provider matching', () => {
  const malPage = '<span class="title-name">Fullmetal Alchemist: Brotherhood</span>';

  it('takes no provider result that is not close to the MAL title', async () => {
    jest.spyOn(metaHttp, 'request').mockResolvedValue({ data: malPage } as any);
    const provider = {
      name: 'Fake',
      search: jest.fn().mockResolvedValue({ results: [{ id: 'naruto', title: 'Naruto' }] }),
      fetchAnimeInfo: jest.fn(),
    } as any;

    const info = await new Myanimelist(provider).fetchAnimeInfo('5114');

    expect(provider.fetchAnimeInfo).not.toHaveBeenCalled();
    expect(info.episodes).toEqual([]);
  });
});

describe('Anilist.Manga provider matching', () => {
  it('takes no search result that is not close to the AniList titles', async () => {
    replayAlways(jest.spyOn(metaHttp, 'post') as any, soloLeveling);
    const provider = {
      name: 'FakeManga',
      search: jest.fn().mockResolvedValue({ results: [{ id: 'one-piece', title: 'One Piece' }] }),
      fetchMangaInfo: jest.fn(),
    } as any;

    const info = await new Anilist.Manga(provider).fetchMangaInfo('105398');

    expect(provider.fetchMangaInfo).not.toHaveBeenCalled();
    expect(info.chapters).toEqual([]);
  });
});
