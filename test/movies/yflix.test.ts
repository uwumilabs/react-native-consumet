import { MOVIES } from '../../lib/typescript/module/src/providers/index';

jest.setTimeout(120000);

const yflix = new MOVIES.YFlix();

test('returns a filled array of movies/tv', async () => {
  const data = await yflix.search('vincenzo');
  expect(data.results).not.toEqual([]);
});

test('returns a filled object of movies/tv data', async () => {
const search = await yflix.search('vincenzo');
  const data = await yflix.fetchMediaInfo(search.results[0]?.id!);
  expect(data.description).not.toEqual('');
  expect(data.episodes).not.toEqual([]);
});

test('returns a filled object of streaming sources', async () => {
    const search = await yflix.search('vincenzo');
  const info = await yflix.fetchMediaInfo(search.results[0]?.id!);
  const episodeSources = await yflix.fetchEpisodeSources(info.episodes![0]?.id!, info.id);
  expect(episodeSources.sources).not.toEqual([]);
});

// test('returns a filled object of movies/tv data by country', async () => {
//   const data = await yflix.fetchByCountry('KR');
//   expect(data.results).not.toEqual([]);
// });

// test('returns a filled object of movies/tv data by genre', async () => {
//   const data = await yflix.fetchByGenre('drama');
//   expect(data.results).not.toEqual([]);
// });
