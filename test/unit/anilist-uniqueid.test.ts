import Anilist from '../../src/providers/meta/anilist';
import { metaHttp } from '../../src/utils/meta-http';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { extensionEntry, registryOf } from './helpers/registry';
import { fakeAnimeProvider } from './helpers/fake-providers';
import attackOnTitan from './fixtures/anilist/media-99147.json';
import { replayAlways } from './fixtures/anilist/replay';
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

// A provider that opts into the ani.zip merge, as the bundled anime providers do.
const provider = (episodes: object[]) =>
  fakeAnimeProvider({
    capabilities: { aniZipEpisodes: true },
    search: jest.fn(async (query: string) => ({ results: [{ id: 'show', title: query }] })),
    info: { episodes },
  });

const timeoutError = () => Object.assign(new Error('timeout of 5000ms exceeded'), { code: 'ECONNABORTED' });

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

describe('Anilist episode identity (META-1, META-2, META-3, META-4)', () => {
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

  it('returns provider episodes with a uniqueId when ani.zip and the filler list time out', async () => {
    jest.spyOn(metaHttp, 'post').mockResolvedValue({ data: { data: { Media: media('Dr. Stone: New World Part 2', 3) } } } as any);
    jest.spyOn(metaHttp, 'get').mockRejectedValue(timeoutError());
    const fake = provider(providerEpisodes(range(1, 3)));

    const episodes = await new Anilist(fake).fetchEpisodesListById('162670', true);

    expect(episodes.map((e) => [e.id, e.uniqueId, e.image])).toEqual([
      ['ep-1', '162670$ep=1', COVER],
      ['ep-2', '162670$ep=2', COVER],
      ['ep-3', '162670$ep=3', COVER],
    ]);
    // Provider episodes fetched alongside ani.zip are reused, not fetched again.
    expect(fake.fetchAnimeInfo).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['declares no capabilities', undefined],
    ['turns aniZipEpisodes off', { aniZipEpisodes: false }],
  ])('keys by provider number, without asking ani.zip, for a provider that %s', async (_label, capabilities) => {
    jest.spyOn(metaHttp, 'post').mockResolvedValue({ data: { data: { Media: media('Dr. Stone: New World Part 2', 3) } } } as any);
    const get = jest.spyOn(metaHttp, 'get');
    const fake = { ...provider(providerEpisodes(range(1, 3))), capabilities };

    const episodes = await new Anilist(fake).fetchEpisodesListById('162670');

    expect(episodes.map((e) => e.uniqueId)).toEqual(['162670$ep=1', '162670$ep=2', '162670$ep=3']);
    expect(get).not.toHaveBeenCalled();
  });

  it('merges ani.zip metadata for a registry-only provider that declares aniZipEpisodes (EXT-1)', async () => {
    stub(drStone, media('Dr. Stone: New World Part 2', 11));
    // No bundled class: exactly what a provider shipped only through the registry looks like.
    const code = `
      function createProbe(ctx) {
        return {
          name: 'RegistryOnly',
          capabilities: { aniZipEpisodes: true },
          search: async (query) => ({ results: [{ id: 'show', title: query }] }),
          fetchAnimeInfo: async () => ({ episodes: [{ id: 'r-1', number: 1 }, { id: 'r-2', number: 2 }] }),
          fetchEpisodeSources: async () => ({ sources: [] }),
          fetchEpisodeServers: async () => [],
        };
      }`;
    const registryOnly: any = await new ProviderManager(registryOf()).executeProviderCode(code, extensionEntry(code));

    const episodes = await new Anilist(registryOnly).fetchEpisodesListById('162670');

    expect(episodes.map((e) => [e.id, e.title, e.uniqueId])).toEqual([
      ['r-1', 'The Kingdom of Science`s Counterattack', '162670$ep=1'],
      ['r-2', 'The Medusa`s True Face', '162670$ep=2'],
    ]);
  });

  it('looks up filler flags by the provider number', async () => {
    const fillers = range(1, 11).map((n) => ({ 'number': String(n), 'filler-bool': n === 1 }));
    stub(drStone, media('Dr. Stone: New World Part 2', 11), fillers);

    const result = await new Anilist(provider(providerEpisodes(range(1, 11)))).fetchEpisodesListById('162670', true);

    expect(result.map((e) => e.isFiller)).toEqual(range(1, 11).map((n) => n === 1));
  });

  it('flags fillers in fetchAnimeInfo too, from a filler list that stops early', async () => {
    // A filler list for MAL 35760, the recorded media, that stops at episode 5.
    const fillers = range(1, 5).map((n) => ({ 'number': String(n), 'filler-bool': n === 3 }));
    replayAlways(jest.spyOn(metaHttp, 'post'), attackOnTitan);
    jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
      if (url === `${FILLER_URL}35760.json`) return { status: 200, data: { episodes: fillers } } as any;
      throw new Error(`unexpected request ${url}`);
    });
    const fake = fakeAnimeProvider({
      results: [{ id: 'show', title: attackOnTitan.body.data.Media.title.romaji }],
      info: { episodes: providerEpisodes(range(1, 12)) },
    });

    const info = await new Anilist(fake).fetchAnimeInfo('99147', true);

    expect(info.episodes!.map((e) => e.isFiller)).toEqual([false, false, true, false, false, ...Array(7).fill(undefined)]);
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

  it('gives fetchAnimeInfo the episodes and keys fetchEpisodesListById gives', async () => {
    stub(drStone, media('Dr. Stone: New World Part 2', 11));
    // Numbered 12-22 and dated a few hours after each episode aired, so ani.zip matches them by date.
    const airTimes = Object.values(drStone.body.episodes).map((e: any) => Date.parse(e.airDateUtc));
    const list = () =>
      providerEpisodes(range(12, 22), (n) => ({ releaseDate: new Date(airTimes[n - 12]! + 3 * 3600_000).toISOString() }));

    const info = await new Anilist(provider(list())).fetchAnimeInfo('162670');
    const episodes = await new Anilist(provider(list())).fetchEpisodesListById('162670');

    expect(info.episodes?.map((e) => e.uniqueId)).toEqual(range(1, 11).map((n) => `162670$ep=${n}`));
    expect(info.episodes).toEqual(episodes);
  });
});
