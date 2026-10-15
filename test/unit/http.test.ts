import axios, { type AxiosAdapter } from 'axios';
import { withRetry } from '../../src/utils/meta-http';
import { fetchTextWithTimeout } from '../../src/utils/fetch-with-timeout';

// An adapter that answers with the given statuses in order, failing like axios does for non-2xx.
const scriptedAdapter = (statuses: number[]) => {
  const calls: number[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const status = statuses[calls.length] ?? 200;
    calls.push(status);
    const response = { data: { status }, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${status}`), {
        isAxiosError: true,
        config,
        response,
      });
    }
    return response;
  };
  return { adapter, calls };
};

describe('withRetry (META-4)', () => {
  it.each([429, 503])('retries once after %i', async (status) => {
    const { adapter, calls } = scriptedAdapter([status, 200]);
    const client = withRetry(axios.create({ adapter }), { baseDelayMs: 1 });

    const { data } = await client.get('https://api.example/x');

    expect(data.status).toBe(200);
    expect(calls).toEqual([status, 200]);
  });

  it('does not retry client errors', async () => {
    const { adapter, calls } = scriptedAdapter([404]);
    const client = withRetry(axios.create({ adapter }), { baseDelayMs: 1 });

    await expect(client.get('https://api.example/x')).rejects.toThrow('404');
    expect(calls).toEqual([404]);
  });

  it('gives up after one retry', async () => {
    const { adapter, calls } = scriptedAdapter([500, 500, 200]);
    const client = withRetry(axios.create({ adapter }), { baseDelayMs: 1 });

    await expect(client.get('https://api.example/x')).rejects.toThrow('500');
    expect(calls).toEqual([500, 500]);
  });
});

describe('fetchTextWithTimeout (META-4)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('aborts a request that never answers', async () => {
    global.fetch = jest.fn(
      (_url: any, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        })
    ) as any;

    await expect(fetchTextWithTimeout('https://cdn.example/code.js', {}, 20)).rejects.toThrow('Timed out after 20ms');
  });

  it('returns the body of a successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', text: async () => 'code' }) as any;

    await expect(fetchTextWithTimeout('https://cdn.example/code.js')).resolves.toEqual({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: 'code',
    });
  });
});
