import { readFileSync } from 'fs';
import { join } from 'path';
import { MangaDex } from '../../src/providers/manga/mangadex';
import { MangaKakalot } from '../../src/providers/manga/mangakakalot';
import { createProviderContext } from '../../src/utils/create-provider-context';

const fixture = (path: string) => readFileSync(join(__dirname, 'fixtures/manga', path), 'utf8');
const withGet = (get: jest.Mock) => ({ ...createProviderContext(), axios: { get } as any });

describe('MangaKakalot search paging', () => {
  it('gives the page asked for as currentPage, whatever page the site served', async () => {
    // The recorded results page is page 1 of the results.
    const get = jest.fn().mockResolvedValue({ data: fixture('mangakakalot/search-tomodachi-game.html') });

    const search = await new MangaKakalot(withGet(get)).search('Tomodachi Game', 3);

    expect(search.currentPage).toBe(3);
  });
});

describe('MangaDex errors', () => {
  it('keeps the HTTP status and the original error of a request that failed without an API message', async () => {
    const failure = Object.assign(new Error('Request failed with status code 400'), {
      isAxiosError: true,
      code: 'ERR_BAD_REQUEST',
      response: { status: 400, data: 'Bad Request' },
    });
    const mangadex = new MangaDex(withGet(jest.fn().mockRejectedValue(failure)));

    const error = await mangadex.search('x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: 'MangaDex: Request failed with status code 400',
      status: 400,
      cause: failure,
    });
  });

  it("keeps the API's own message with the status", async () => {
    const notFound = JSON.parse(fixture('mangadex/manga-not-found.json'));
    const failure = Object.assign(new Error('Request failed with status code 404'), {
      response: { status: 404, data: notFound },
    });
    const mangadex = new MangaDex(withGet(jest.fn().mockRejectedValue(failure)));

    const error = await mangadex.fetchChapterPages('00000000-0000-0000-0000-000000000000').catch((e: unknown) => e);

    expect(error).toMatchObject({ message: expect.stringMatching(/^MangaDex: .*not found/), status: 404 });
  });
});
