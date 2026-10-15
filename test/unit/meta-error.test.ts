import { MetaError } from '../../src';

describe('MetaError', () => {
  it('keeps the source, the HTTP status and the cause of an axios error', () => {
    const axiosError = Object.assign(new Error('Request failed with status code 429'), { response: { status: 429 } });

    const error = MetaError.from('anilist', axiosError);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'MetaError', source: 'anilist', status: 429, cause: axiosError });
    expect(error.message).toBe('Request failed with status code 429');
  });

  it('passes an existing MetaError through unchanged', () => {
    const original = new MetaError('no match', { source: 'tmdb' });
    expect(MetaError.from('provider', original)).toBe(original);
  });

  it('wraps non-Error values without a status', () => {
    expect(MetaError.from('mal', 'boom')).toMatchObject({ message: 'boom', source: 'mal', status: undefined });
  });
});
