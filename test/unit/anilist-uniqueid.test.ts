import Anilist from '../../src/providers/meta/anilist';
import { metaHttp } from '../../src/utils/meta-http';
import drStoneFixture from './fixtures/anizip/162670.json';
import reZeroFixture from './fixtures/anizip/21355.json';
import notInAniZipFixture from './fixtures/anizip/216895.json';
import noEpisodesFixture from './fixtures/anizip/198727.json';

// ani.zip responses recorded on 2026-10-15 (see each fixture's `note`), replayed offline.
type Fixture = { request: string; status: number; body: any };

const FILLER_URL = 'https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/';
const COVER = 'https://img.example/cover.jpg';

const media = (romaji: string, episodes: number | null) => ({
  idMal: 1,
  title: { romaji, english: romaji },
  status: 'FINISHED',
  episodes,
  startDate: { year: 2023 },
  coverImage: { extraLarge: COVER },
});

const stub = (fixture: Fixture, anilistMedia: object, fillers?: { 'number': string; 'filler-bool': boolean }[]) => {
  jest.spyOn(metaHttp, 'post').mockResolvedValue({ data: { data: { Media: anilistMedia } } } as any);
  jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
    if (url.startsWith(FILLER_URL)) return { data: { episodes: fillers ?? [] } } as any;
    if (url !== fixture.request) throw new Error(`unexpected request ${url}`);
    if (fixture.status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${fixture.status}`), {
        response: { status: fixture.status, data: fixture.body },
      });
    }
    return { status: fixture.status, data: fixture.body } as any;
  });
};

// A provider shipped through the registry that opts into the ani.zip merge.
const provider = (episodes: object[]) =>
  ({
    name: 'Fake',
    capabilities: { aniZipEpisodes: true },
    search: jest.fn().mockResolvedValue({ results: [{ id: 'show', title: 'Show' }] }),
    fetchAnimeInfo: jest.fn().mockResolvedValue({ episodes }),
    fetchEpisodeSources: jest.fn(),
    fetchEpisodeServers: jest.fn(),
  }) as any;

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const providerEpisodes = (numbers: number[], extra: (n: number) => object = () => ({})) =>
  numbers.map((n) => ({ id: `ep-${n}`, number: n, title: `Episode ${n}`, ...extra(n) }));

const withEpisodes = (fixture: Fixture, edit: (episodes: Record<string, any>) => Record<string, any>): Fixture => {
  const copy = JSON.parse(JSON.stringify(fixture));
  copy.body.episodes = edit(copy.body.episodes);
  return copy;
};

const drStone = drStoneFixture as Fixture;
const reZero = reZeroFixture as Fixture;

afterEach(() => jest.restoreAllMocks());

describe('Anilist episode identity (META-1, META-2, META-3)', () => {
  it('keys Dr. Stone New World Part 2 by AniDB episode 1-11, not TVDB 12-22, and keeps the provider numbers', async () => {
    stub(drStone, media('Dr. Stone: New World Part 2', 11));

    const episodes = await new Anilist(provider(providerEpisodes(range(1, 11)))).fetchEpisodesListById('162670');

    expect(episodes.map((e) => e.uniqueId)).toEqual(range(1, 11).map((n) => `162670$ep=${n}`));
    expect(episodes.map((e) => e.number)).toEqual(range(1, 11));
    expect(episodes.map((e) => e.tvdbNumber)).toEqual(range(12, 22));
    expect(episodes.map((e) => e.absoluteNumber)).toEqual(range(48, 58));
    expect(episodes[0]).toEqual(
      expect.objectContaining({
        id: 'ep-1',
        title: 'The Kingdom of Science`s Counterattack',
        releaseDate: '2023-10-12',
        image: expect.stringContaining('thetvdb.com'),
      })
    );
  });

  it('gives the same keys to a provider that continues the previous season count, matching by air date', async () => {
    stub(drStone, media('Dr. Stone: New World Part 2', 11));
    // Numbered 12-22 and dated a few hours after each episode aired.
    const airTimes = Object.values(drStone.body.episodes).map((e: any) => Date.parse(e.airDateUtc));
    const episodes = providerEpisodes(range(12, 22), (n) => ({
      releaseDate: new Date(airTimes[n - 12]! + 3 * 3600_000).toISOString(),
    }));

    const result = await new Anilist(provider(episodes)).fetchEpisodesListById('162670');

    expect(result.map((e) => e.uniqueId)).toEqual(range(1, 11).map((n) => `162670$ep=${n}`));
    expect(result.map((e) => e.number)).toEqual(range(12, 22));
    expect(result[0]!.title).toBe('The Kingdom of Science`s Counterattack');
  });

  it('never puts a special key or title on a regular Re:Zero episode', async () => {
    stub(reZero, media('Re:Zero kara Hajimeru Isekai Seikatsu', 25));
    // Re-uploaded on 2020-01-01, the day the special O1 aired, plus an extra 26th entry that the old
    // index fallback paired with special S1.
    const episodes = providerEpisodes(range(1, 26), () => ({ releaseDate: '2020-01-01T10:00:00Z' }));

    const result = await new Anilist(provider(episodes)).fetchEpisodesListById('21355');

    expect(result.map((e) => e.uniqueId)).toEqual(range(1, 26).map((n) => `21355$ep=${n}`));
    expect(result.map((e) => e.number)).toEqual(range(1, 26));
    expect(result.every((e) => /^21355\$ep=\d+$/.test(e.uniqueId))).toBe(true);
    const specialTitles = Object.entries(reZero.body.episodes)
      .filter(([key]) => !/^\d+$/.test(key))
      .map(([, e]: [string, any]) => e.title.en);
    expect(result.filter((e) => specialTitles.includes(e.title))).toEqual([]);
    expect(result[0]!.title).toBe('The End of the Beginning and the Beginning of the End');
    expect(result[25]).toEqual(expect.objectContaining({ title: 'Episode 26', uniqueId: '21355$ep=26' }));
  });

  it('gives provider-numbered keys to an airing show that ani.zip does not have (404)', async () => {
    stub(notInAniZipFixture as Fixture, media('Aoki Denshou: Welsh & Shedar', 12));

    const result = await new Anilist(provider(providerEpisodes([1, 2]))).fetchEpisodesListById('216895');

    expect(result).toEqual([
      expect.objectContaining({ id: 'ep-1', number: 1, title: 'Episode 1', uniqueId: '216895$ep=1', image: COVER }),
      expect.objectContaining({ id: 'ep-2', number: 2, title: 'Episode 2', uniqueId: '216895$ep=2', image: COVER }),
    ]);
    expect(result.every((e) => e.tvdbNumber === undefined)).toBe(true);
  });

  it('gives provider-numbered keys when ani.zip lists no episodes yet', async () => {
    stub(noEpisodesFixture as Fixture, media('Chitose-kun wa Ramune Bin no Naka Part 2', 11));

    const result = await new Anilist(provider(providerEpisodes([1]))).fetchEpisodesListById('198727');

    expect(result).toEqual([expect.objectContaining({ number: 1, title: 'Episode 1', uniqueId: '198727$ep=1' })]);
  });

  it('keeps every key stable when ani.zip catches up with an airing show', async () => {
    const lagging = withEpisodes(drStone, (episodes) =>
      Object.fromEntries(Object.entries(episodes).filter(([key]) => Number(key) <= 4))
    );
    const list = () => providerEpisodes(range(1, 11));

    stub(lagging, media('Dr. Stone: New World Part 2', null));
    const before = await new Anilist(provider(list())).fetchEpisodesListById('162670');
    jest.restoreAllMocks();
    stub(drStone, media('Dr. Stone: New World Part 2', 11));
    const after = await new Anilist(provider(list())).fetchEpisodesListById('162670');

    expect(before.map((e) => e.uniqueId)).toEqual(after.map((e) => e.uniqueId));
    expect(before[4]!.title).toBe('Episode 5');
    expect(after[4]!.title).toBe('Total War');
  });

  it('matches by number before date when every episode shares one air day', async () => {
    // A full-season drop: ani.zip dates all 11 episodes the same day, and so does the provider.
    const sameDay = withEpisodes(drStone, (episodes) => {
      for (const e of Object.values(episodes)) Object.assign(e, { airDate: '2023-10-12', airDateUtc: '2023-10-12T13:00:00Z' });
      return episodes;
    });
    stub(sameDay, media('Dr. Stone: New World Part 2', 11));
    const episodes = providerEpisodes(range(1, 11), () => ({ releaseDate: '2023-10-12T15:00:00Z' }));

    const result = await new Anilist(provider(episodes)).fetchEpisodesListById('162670');

    expect(result.map((e) => [e.number, e.uniqueId, e.tvdbNumber])).toEqual(
      range(1, 11).map((n) => [n, `162670$ep=${n}`, n + 11])
    );
    expect(result[4]!.title).toBe('Total War');
  });

  it('keeps same-day episodes apart when matching by date, whatever order the provider lists them in', async () => {
    // A double premiere: AniDB 1 and 2 air the same day; the provider numbers them 12 and 13.
    const doublePremiere = withEpisodes(drStone, (episodes) => {
      Object.assign(episodes['2'], { airDate: '2023-10-12', airDateUtc: '2023-10-12T13:30:00Z' });
      return episodes;
    });
    const dated = providerEpisodes([12, 13], () => ({ releaseDate: '2023-10-12T18:00:00Z' }));

    for (const list of [dated, [...dated].reverse()]) {
      stub(doublePremiere, media('Dr. Stone: New World Part 2', 11));
      const result = await new Anilist(provider(list)).fetchEpisodesListById('162670');
      const byNumber = Object.fromEntries(result.map((e) => [e.number, e.uniqueId]));
      expect(byNumber).toEqual({ 12: '162670$ep=1', 13: '162670$ep=2' });
      jest.restoreAllMocks();
    }
  });

  it('breaks a tie between two copies of one number with the release date', async () => {
    stub(drStone, media('Dr. Stone: New World Part 2', 11));
    const episodes = [
      { id: 'reupload-3', number: 3, title: 'Episode 3 (re-upload)', releaseDate: '2024-05-01T00:00:00Z' },
      { id: 'ep-3', number: 3, title: 'Episode 3', releaseDate: '2023-10-26T15:00:00Z' },
    ];

    const result = await new Anilist(provider(episodes)).fetchEpisodesListById('162670');

    expect(result[1]).toEqual(expect.objectContaining({ id: 'ep-3', title: 'Deal Game, Test of Wit', tvdbNumber: 14 }));
    expect(result[0]).toEqual(expect.objectContaining({ id: 'reupload-3', title: 'Episode 3 (re-upload)' }));
    expect(result.every((e) => typeof e.uniqueId === 'string')).toBe(true);
  });

  it('looks up filler flags by the provider number', async () => {
    const fillers = range(1, 11).map((n) => ({ 'number': String(n), 'filler-bool': n === 1 }));
    stub(drStone, media('Dr. Stone: New World Part 2', 11), fillers);

    const result = await new Anilist(provider(providerEpisodes(range(1, 11)))).fetchEpisodesListById('162670', true);

    expect(result.map((e) => e.isFiller)).toEqual(range(1, 11).map((n) => n === 1));
  });

  it('falls back to the list position only for an episode the provider gives no number', async () => {
    stub(noEpisodesFixture as Fixture, media('Chitose-kun wa Ramune Bin no Naka Part 2', 11));
    const episodes = [
      { id: 'ep-1', number: 1 },
      { id: 'special', number: undefined },
    ];

    const result = await new Anilist(provider(episodes)).fetchEpisodesListById('198727');

    expect(result.map((e) => e.uniqueId)).toEqual(['198727$ep=1', '198727$ep=2']);
  });

  it('gives fetchAnimeInfo episodes a uniqueId from the provider number', async () => {
    jest.spyOn(metaHttp, 'post').mockResolvedValue({
      data: {
        data: {
          Media: {
            ...media('Dr. Stone: New World Part 2', 11),
            startDate: { year: 2023, month: 10, day: 12 },
            endDate: { year: 2023, month: 12, day: 21 },
            studios: { edges: [] },
            externalLinks: [],
          },
        },
      },
    } as any);

    const info = await new Anilist(provider(providerEpisodes([1, 2]))).fetchAnimeInfo('162670');

    expect(info.episodes?.map((e) => e.uniqueId)).toEqual(['162670$ep=1', '162670$ep=2']);
  });
});
