import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as Extractors from '../../src/extractors';
import { defaultAxios, defaultExtractorContext } from '../../src/utils/extension-utils';
import { PolyURL } from '../../src/utils/url-polyfill';

// PROV-2: one provider pattern. Providers and extractors make their requests through the context
// they're given (ctx.axios), factories hand that context on to their extractors, classes accept a
// context, and every module exports by name.

const repoRoot = path.join(__dirname, '../..');

/** An axios stand-in that records every request and fails it, so nothing leaves the test. */
function stubAxios(): any {
  const fail = async () => {
    throw new Error('stub axios');
  };
  return Object.assign(jest.fn(fail), { get: jest.fn(fail), post: jest.fn(fail), request: jest.fn(fail) });
}

/** URLs of every request made through a stub axios. */
const requestedUrls = (stub: any): string[] =>
  [...stub.mock.calls, ...stub.get.mock.calls, ...stub.post.mock.calls].map(([arg]) =>
    typeof arg === 'string' ? arg : arg.url
  );

/** Source files under the given directories of src/. */
function sourceFiles(...dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.tsx?$/.test(entry.name) ? [path.relative(repoRoot, full)] : [];
    });
  return dirs.flatMap((dir) => walk(path.join(repoRoot, 'src', dir)));
}

const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

// Every request in a test must go through a stub; these catch (and block) the shared instances.
let realAxios: jest.SpyInstance[];
beforeEach(() => {
  const blocked = async () => {
    throw new Error('request made outside the context axios');
  };
  realAxios = [axios, defaultAxios].flatMap((instance) =>
    (['get', 'post', 'request'] as const).map((method) => jest.spyOn(instance, method).mockImplementation(blocked))
  );
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const LEGACY_EXTRACTORS = [
  'AsianLoad',
  'Filemoon',
  'GogoCDN',
  'MixDrop',
  'Mp4Player',
  'Mp4Upload',
  'RapidCloud',
  'StreamHub',
  'StreamLare',
  'StreamSB',
  'StreamTape',
  'VidMoly',
  'VizCloud',
  'Voe',
] as const;

describe('class-based extractors use the context axios (PROV-2)', () => {
  it.each(LEGACY_EXTRACTORS)('%s sends its requests through ctx.axios', async (name) => {
    const ctx = { ...defaultExtractorContext, axios: stubAxios() };
    const extractor: any = new Extractors[name](ctx);

    await extractor
      .extract(new URL('https://host.test/e/abc?id=1'), 'https://helper.test', 'api-key')
      .catch(() => undefined);

    expect(requestedUrls(ctx.axios).length).toBeGreaterThan(0);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it('defaults to the library context', async () => {
    await new Extractors.MixDrop().extract(new URL('https://host.test/e/abc')).catch(() => undefined);

    expect(defaultAxios.get).toHaveBeenCalledWith('https://host.test/e/abc');
  });

  it('MegaUp fetches the subtitle list through ctx.axios', async () => {
    const ctx = { ...defaultExtractorContext, axios: stubAxios() };
    const embed = 'https://megaup.test/e/abc?sub.list=https%3A%2F%2Fsubs.test%2Flist.json';

    await expect(Extractors.MegaUp(ctx).extract(new PolyURL(embed))).rejects.toThrow('stub axios');

    expect(requestedUrls(ctx.axios)).toEqual(['https://subs.test/list.json']);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it.each(['../../src/extractors/gogocdn', '../../src/extractors', '../../src/utils/extension-utils'])(
    'defaultExtractors has every extractor when %s loads first',
    (first) => {
      jest.isolateModules(() => {
        require(first);
        const { defaultExtractors } = require('../../src/utils/extension-utils');
        for (const [name, extractor] of Object.entries(defaultExtractors)) {
          expect([name, typeof extractor]).toEqual([name, 'function']);
        }
      });
    }
  );
});

describe('one export style (PROV-2)', () => {
  const VALUE_AXIOS_IMPORT = /^import\s+(?!type\b)[^;]*?from\s+'axios'/m;

  it('extractors import axios only for its types', () => {
    const offenders = sourceFiles('extractors').filter((file) => VALUE_AXIOS_IMPORT.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it('extractors export by name only', () => {
    const offenders = sourceFiles('extractors').filter((file) => /^export default\b/m.test(read(file)));
    expect(offenders).toEqual([]);
  });
});
