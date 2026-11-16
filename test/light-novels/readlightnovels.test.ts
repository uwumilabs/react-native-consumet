import { LIGHT_NOVELS } from '../../src/providers';
import { expectMediaSearch } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

const provider = new LIGHT_NOVELS.ReadLightNovels();

test('search returns light novels', async () => {
  expectMediaSearch(await provider.search('slime'));
});

test('fetchLightNovelInfo returns the description and chapters, and fetchChapterContent the first chapter', async () => {
  const info = await provider.fetchLightNovelInfo('tensei-shitara-slime-datta-ken');

  expect(info.description).toMatch(/\S/);
  expect(info.chapters!.length).toBeGreaterThan(0);
  expect(info.chapters!.filter((chapter) => !chapter.id?.trim() || !chapter.title?.trim())).toEqual([]);

  const content = await provider.fetchChapterContent(info.chapters![0]!.id);
  expect(content.text).toMatch(/\S/);
});
