import Anilist from '../../src/providers/meta/anilist';
import { AniKoto } from '../../src/providers/anime/anikoto/anikoto';
import { metaHttp } from '../../src/utils/meta-http';

// AniKoto's search results for "JUJUTSU KAISEN 0" (2026-10-24), the ones similar enough to be considered
const searchResults = [
  { id: 'jujutsu-kaisen-0-movie-lmsg3', title: 'Jujutsu Kaisen 0 Movie', type: 'Movie' },
  { id: 'jujutsu-kaisen-tv-8ssye', title: 'Jujutsu Kaisen (TV)', type: 'TV' },
  { id: 'jujutsu-kaisen-specials-libnr', title: 'Jujutsu Kaisen: Specials', type: 'Special' },
  { id: 'jujutsu-kaisen-2nd-season-hk2c9', title: 'Jujutsu Kaisen 2nd Season', type: 'TV' },
  {
    id: 'jujutsu-kaisen-hidden-inventory-premature-death-wjoxj',
    title: 'Jujutsu Kaisen: Hidden Inventory/Premature Death',
    type: 'Movie',
  },
];

const fakeAniKoto = () => {
  const provider: any = Object.create(AniKoto.prototype);
  provider.search = jest.fn().mockResolvedValue({ results: searchResults });
  provider.fetchAnimeInfo = jest.fn().mockResolvedValue({ episodes: [{ id: 'ep-1', number: 1 }] });
  return provider;
};

const matchedId = async (media: { format: string; title: { romaji: string; english: string } }) => {
  jest
    .spyOn(metaHttp, 'post')
    .mockResolvedValue({ data: { data: { Media: { idMal: 1, episodes: 1, startDate: { year: 2021 }, ...media } } } } as any);
  jest.spyOn(metaHttp, 'get').mockRejectedValue(new Error('offline'));
  const provider = fakeAniKoto();
  await new Anilist(provider).fetchEpisodesListById('1');
  return provider.fetchAnimeInfo.mock.calls[0][0];
};

afterEach(() => jest.restoreAllMocks());

describe('Anilist provider matching', () => {
  it('picks the movie for a movie whose title only differs from the series by a number', async () => {
    expect(
      await matchedId({ format: 'MOVIE', title: { romaji: 'Gekijouban Jujutsu Kaisen 0', english: 'JUJUTSU KAISEN 0' } })
    ).toBe('jujutsu-kaisen-0-movie-lmsg3');
  });

  it('still picks the series for the series', async () => {
    expect(await matchedId({ format: 'TV', title: { romaji: 'Jujutsu Kaisen', english: 'JUJUTSU KAISEN' } })).toBe(
      'jujutsu-kaisen-tv-8ssye'
    );
  });

  it('picks the numbered season for a later season', async () => {
    expect(
      await matchedId({
        format: 'TV',
        title: { romaji: 'Jujutsu Kaisen 2nd Season', english: 'JUJUTSU KAISEN Season 2' },
      })
    ).toBe('jujutsu-kaisen-2nd-season-hk2c9');
  });
});
