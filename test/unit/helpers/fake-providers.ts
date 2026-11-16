/**
 * Providers for the meta tests (Anilist, Myanimelist, TMDB): `search` finds `results`, the info
 * method returns `info`, and every method is a jest mock a test can change. `overrides` replace any
 * field, `capabilities` included.
 */

import { jest } from '@jest/globals';

type Options = { results?: object[]; info?: object; [field: string]: unknown };

const mock = () => jest.fn<(...args: any[]) => any>();
const searchFinding = (results: object[]) =>
  mock().mockResolvedValue({ currentPage: 1, hasNextPage: false, results });

export const fakeAnimeProvider = ({ results = [], info = { episodes: [] }, ...overrides }: Options = {}) => ({
  name: 'FakeProvider',
  search: searchFinding(results),
  fetchAnimeInfo: mock().mockResolvedValue(info),
  fetchEpisodeSources: mock(),
  fetchEpisodeServers: mock(),
  ...overrides,
});

export const fakeMovieProvider = ({ results = [], info, ...overrides }: Options = {}) => ({
  name: 'FakeProvider',
  search: searchFinding(results),
  fetchMediaInfo: mock().mockResolvedValue(info),
  fetchEpisodeSources: mock(),
  fetchEpisodeServers: mock(),
  ...overrides,
});

export const fakeMangaProvider = ({ results = [], info = { chapters: [] }, ...overrides }: Options = {}) => ({
  name: 'FakeManga',
  search: searchFinding(results),
  fetchMangaInfo: mock().mockResolvedValue(info),
  fetchChapterPages: mock(),
  ...overrides,
});
