import { readFileSync } from 'fs';
import { join } from 'path';
import Myanimelist from '../../src/providers/meta/mal';
import { MediaStatus, SubOrDub, type IAnimeInfo } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';

// Recorded MAL anime pages (trimmed): Fullmetal Alchemist: Brotherhood (5114, a finished series),
// One Piece (21, still airing) and Kimi no Na wa. (32281, a movie with a single air date).
const page = (id: number) => readFileSync(join(__dirname, `fixtures/mal/anime-${id}.html`), 'utf8');
const stubMal = (html: string) => jest.spyOn(metaHttp, 'request').mockResolvedValue({ data: html });

const fakeProvider = (results: { id: string; title: string }[] = [], info?: Partial<IAnimeInfo>) => ({
  name: 'FakeProvider',
  search: jest.fn().mockResolvedValue({ currentPage: 1, hasNextPage: false, results }),
  fetchAnimeInfo: jest.fn().mockResolvedValue(info),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
});

const fetchMalInfo = (id: number) => new Myanimelist(fakeProvider() as any).fetchMalInfoById(String(id));

afterEach(() => jest.restoreAllMocks());

describe('Myanimelist.fetchMalInfoById dates (META-9)', () => {
  it('gives 1-based months, as AniList does', async () => {
    stubMal(page(5114));
    const info = await fetchMalInfo(5114);

    // "Aired: Apr 5, 2009 to Jul 4, 2010"
    expect(info.startDate).toEqual({ year: 2009, month: 4, day: 5 });
    expect(info.endDate).toEqual({ year: 2010, month: 7, day: 4 });
    expect(info.status).toBe(MediaStatus.COMPLETED);
    expect(info.season).toBe('SPRING');
  });

  it('leaves endDate unset for a show still airing', async () => {
    stubMal(page(21));
    const info = await fetchMalInfo(21);

    // "Aired: Oct 20, 1999 to ?"
    expect(info.startDate).toEqual({ year: 1999, month: 10, day: 20 });
    expect(info.endDate).toBeUndefined();
    expect(info.status).toBe(MediaStatus.ONGOING);
  });

  it('reads the single air date of a movie', async () => {
    stubMal(page(32281));
    const info = await fetchMalInfo(32281);

    // "Aired: Aug 26, 2016", with no "to"
    expect(info.startDate).toEqual({ year: 2016, month: 8, day: 26 });
    expect(info.endDate).toBeUndefined();
  });

  it('leaves out the parts of a date MAL does not give', async () => {
    const aired = (text: string) =>
      `<div class="spaceit_pad"><span class="dark_text">Aired:</span> ${text}</div>`;

    stubMal(aired('Jan 2009 to 2010'));
    let info = await fetchMalInfo(1);
    expect(info.startDate).toEqual({ year: 2009, month: 1 });
    expect(info.endDate).toEqual({ year: 2010 });

    stubMal(aired('Not available'));
    info = await fetchMalInfo(1);
    expect(info.startDate).toBeUndefined();
    expect(info.endDate).toBeUndefined();
  });
});

describe('Myanimelist.fetchMalInfoById titles (META-9)', () => {
  it('reads the alternative titles by their labels', async () => {
    stubMal(page(5114));
    const info = await fetchMalInfo(5114);

    expect(info.title).toEqual({
      romaji: 'Fullmetal Alchemist: Brotherhood',
      english: 'Fullmetal Alchemist: Brotherhood',
      native: '鋼の錬金術師 FULLMETAL ALCHEMIST',
      userPreferred: 'Fullmetal Alchemist: Brotherhood',
    });
    expect(info.synonyms).toEqual([
      'Hagane no Renkinjutsushi: Fullmetal Alchemist',
      'Fullmetal Alchemist (2009)',
      'FMA',
      'FMAB',
    ]);
    expect(info.totalEpisodes).toBe(64);
    expect(info.studios).toEqual(['Bones']);
  });

  it('gives no synonyms and the right native title when MAL lists no synonyms', async () => {
    stubMal(page(32281));
    const info = await fetchMalInfo(32281);

    // By position this page gave native "Japanese: 君の名は。" and synonyms ["Alternative Titles"].
    expect(info.title).toEqual(expect.objectContaining({ native: '君の名は。', english: 'Your Name.' }));
    expect(info.synonyms).toEqual([]);
  });
});

describe('Myanimelist.fetchAnimeInfo provider episodes (META-9)', () => {
  const results = [{ id: 'fmab', title: 'Fullmetal Alchemist: Brotherhood' }];
  const episodes = [1, 2].map((number) => ({
    id: `fmab-${number}`,
    number,
    title: `Episode ${number}`,
    image: `https://img.example/fmab/${number}.jpg`,
    description: `Episode ${number} of FMA:B`,
  }));
  const fetchAnimeInfo = (provider: ReturnType<typeof fakeProvider>, dub = false) => {
    stubMal(page(5114));
    return new Myanimelist(provider as any).fetchAnimeInfo('5114', dub);
  };

  it("returns the provider's episodes when the provider doesn't report sub or dub", async () => {
    const provider = fakeProvider(results, { id: 'fmab', title: 'FMA:B', episodes });

    const info = await fetchAnimeInfo(provider);

    expect(provider.fetchAnimeInfo).toHaveBeenCalledWith('fmab');
    expect(info.episodes?.map((e) => e.id)).toEqual(['fmab-1', 'fmab-2']);
  });

  it('returns the episodes for the audio the provider reports', async () => {
    const both = await fetchAnimeInfo(fakeProvider(results, { id: 'fmab', subOrDub: SubOrDub.BOTH, episodes }), true);
    expect(both.episodes).toHaveLength(2);

    const sub = await fetchAnimeInfo(fakeProvider(results, { id: 'fmab', hasSub: true, episodes }));
    expect(sub.episodes).toHaveLength(2);
  });

  it('returns no episodes when the provider only has the other audio', async () => {
    const subOnly = await fetchAnimeInfo(fakeProvider(results, { id: 'fmab', subOrDub: SubOrDub.SUB, episodes }), true);
    expect(subOnly.episodes).toEqual([]);

    const noDub = await fetchAnimeInfo(fakeProvider(results, { id: 'fmab', hasSub: true, hasDub: false, episodes }), true);
    expect(noDub.episodes).toEqual([]);
  });

  it('returns no episodes when the provider search finds nothing', async () => {
    const provider = fakeProvider([]);

    const info = await fetchAnimeInfo(provider);

    expect(info.episodes).toEqual([]);
    expect(provider.fetchAnimeInfo).not.toHaveBeenCalled();
  });
});
