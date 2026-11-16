import Anilist from '../../src/providers/meta/anilist';
import { metaHttp } from '../../src/utils/meta-http';
import airingSchedule from './fixtures/anilist/airing-schedule.json';
import { replay, sentBodies } from './fixtures/anilist/replay';
import { fakeAnimeProvider } from './helpers/fake-providers';

// Friday 16 October 2026, 15:30 local time. Days are built in local time, like the library does.
const NOW = new Date(2026, 9, 16, 15, 30);
const midnight = (day: number) => new Date(2026, 9, day).getTime() / 1000;

/** The `airingAt` bounds fetchAiringSchedule sends to AniList. */
const windowFor = async (...args: Parameters<Anilist['fetchAiringSchedule']>) => {
  const post = replay(jest.spyOn(metaHttp, 'post'), airingSchedule);
  await new Anilist(fakeAnimeProvider()).fetchAiringSchedule(...args);
  const { airingAtGreater, airingAtLesser } = sentBodies(post)[0]!.variables!;
  jest.restoreAllMocks();
  return [airingAtGreater, airingAtLesser];
};

beforeEach(() => jest.useFakeTimers({ now: NOW }));
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Anilist.fetchAiringSchedule (META-12)', () => {
  it('sends Unix timestamps for a full week from today by default, not weekday numbers', async () => {
    // Exclusive bounds: from one second before today's midnight to the midnight a week later.
    expect(await windowFor()).toEqual([midnight(16) - 1, midnight(23)]);
  });

  it('turns weekday numbers and names into the same timestamps', async () => {
    // 2 = Monday, 6 = Friday: the coming Monday through the Friday after it.
    const expected = [midnight(19) - 1, midnight(24)];

    expect(await windowFor(1, 20, 2, 6)).toEqual(expected);
    expect(await windowFor(1, 20, 'monday', 'Friday')).toEqual(expected);
    expect(await windowFor(1, 20, 2, ' FRIDAY ')).toEqual(expected);
  });

  it('ends on the first weekEnd on or after weekStart, including that day', async () => {
    expect(await windowFor(1, 20, 'wednesday', 'monday')).toEqual([midnight(21) - 1, midnight(27)]);
    expect(await windowFor(1, 20, 'friday', 'friday')).toEqual([midnight(16) - 1, midnight(17)]);
  });

  it.each([7, -1, 2.5, 'funday'])('rejects the weekday %p without calling AniList', async (day) => {
    const post = jest.spyOn(metaHttp, 'post');

    await expect(new Anilist(fakeAnimeProvider()).fetchAiringSchedule(1, 20, day, 'friday')).rejects.toThrow(
      'Invalid weekStart or weekEnd'
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('maps the recorded schedule', async () => {
    replay(jest.spyOn(metaHttp, 'post'), airingSchedule);

    const { results, hasNextPage } = await new Anilist(fakeAnimeProvider()).fetchAiringSchedule(1, 3);

    expect(hasNextPage).toBe(true);
    expect(results.map((r) => [r.id, r.episode, r.airingAt, r.country])).toEqual([
      ['199340', 1, 1792076400, 'JP'],
      ['180136', 16, 1792077960, 'JP'],
      ['178868', 2, 1791989160, 'JP'],
    ]);
    expect(results[1]).toEqual(
      expect.objectContaining({
        title: {
          romaji: 'Tsuihou Sareta Tensei Juukishi wa Game Chishiki de Musou Suru',
          english: 'The Exiled Heavy Knight Knows How to Game the System',
          userPreferred: 'Tsuihou Sareta Tensei Juukishi wa Game Chishiki de Musou Suru',
          native: '追放された転生重騎士はゲーム知識で無双する',
        },
        status: 'Ongoing',
        image: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx180136-gtMTCRlOD4OE.jpg',
      })
    );
  });
});
