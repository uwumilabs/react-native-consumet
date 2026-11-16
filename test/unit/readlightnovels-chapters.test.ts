import { ReadLightNovels } from '../../src/providers/light-novels/readlightnovels';
import { createProviderContext } from '../../src/utils/create-provider-context';

describe('ReadLightNovels chapter pages', () => {
  it('asks admin-ajax.php for a page of chapters with a urlencoded form', async () => {
    const page = '<input id="id_post" value="42"><div class="col-xs-12 col-sm-8 col-md-8 desc"><h3>Novel</h3></div>';
    const axios = Object.assign(jest.fn().mockResolvedValue({ data: { list_chap: '<ul class="list-chapter"></ul>' } }), {
      get: jest.fn().mockResolvedValue({ data: page }),
    });
    const ctx = { ...createProviderContext({ userAgent: 'test-agent' }), axios: axios as any };

    await new ReadLightNovels(ctx).fetchLightNovelInfo('novel', 3);

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: 'https://readlightnovels.net/wp-admin/admin-ajax.php',
        data: 'action=tw_ajax&type=pagination&page=3&id=42',
        headers: expect.objectContaining({ 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'test-agent' }),
      })
    );
  });
});
