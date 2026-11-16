// eslint-disable-next-line @typescript-eslint/no-var-requires
const retention = require('../../scripts/registry-retention');
const { registryLayout } = require('../../scripts/registry-paths');

const RAW = 'https://raw.githubusercontent.com/o/r/refs/heads/main';
const published = (kind: string, key: string, version: string) => ({
  kind,
  key,
  version,
  file: `registry/${kind}/${key}/${version}.js`,
});
const entry = (key: string, version: string) => ({
  id: key,
  version,
  main: `${RAW}/registry/extensions/${key}/${version}.js`,
});

describe('supported releases', () => {
  it('are every tag in the two most recent minor lines', () => {
    expect(retention.supportedTags(['v1.4.0', 'v1.5.0', 'v1.5.1', 'v1.6.0', 'v1.6.1'])).toEqual([
      'v1.5.0',
      'v1.5.1',
      'v1.6.0',
      'v1.6.1',
    ]);
  });

  it('span a major bump', () => {
    expect(retention.supportedTags(['v1.8.0', 'v1.9.0', 'v1.9.2', 'v2.0.0'])).toEqual(['v1.9.0', 'v1.9.2', 'v2.0.0']);
  });
});

describe('published files', () => {
  const { parsePublishedFile, publishedFile } = registryLayout();

  it('are read from published URLs; older dist URLs have none', () => {
    expect(parsePublishedFile(`${RAW}/registry/extractors/kwik/1.2.1.js`)).toEqual(
      published('extractors', 'kwik', '1.2.1')
    );
    expect(parsePublishedFile(`${RAW}/dist/extractors/kwik.js`)).toBeUndefined();
  });

  it("are named after the entry's lowercase id or name and its version", () => {
    expect(publishedFile('extractors', { name: 'MegaCloud', version: '1.3.3' })).toBe(
      'registry/extractors/megacloud/1.3.3.js'
    );
    expect(publishedFile('extensions', { id: 'anikoto', version: '1.1.5' })).toBe('registry/extensions/anikoto/1.1.5.js');
    expect(publishedFile('extensions', { id: '../anikoto', version: '1.1.5' })).toBeUndefined();
    expect(publishedFile('extensions', { id: 'anikoto', version: '1.1.5-beta' })).toBeUndefined();
  });
});

describe('retention rule (planPrune)', () => {
  const files = [
    published('extensions', 'anikoto', '1.0.0'),
    published('extensions', 'anikoto', '1.1.0'),
    published('extensions', 'anikoto', '1.1.1'),
    published('extensions', 'anikoto', '1.1.2'),
    published('extensions', 'removed', '1.0.0'),
  ];
  const current = { extensions: [entry('anikoto', '1.1.2')], extractors: [] };

  it('keeps the current version and the one before it', () => {
    const { keep, deletable } = retention.planPrune(current, files, []);

    expect(keep.get('registry/extensions/anikoto/1.1.2.js')).toEqual(['current']);
    expect(keep.get('registry/extensions/anikoto/1.1.1.js')).toEqual(['previous version (rollback)']);
    expect(deletable.map((f: any) => f.file)).toEqual([
      'registry/extensions/anikoto/1.0.0.js',
      'registry/extensions/anikoto/1.1.0.js',
      'registry/extensions/removed/1.0.0.js',
    ]);
  });

  it('keeps versions a supported release still references', () => {
    const supported = [{ tag: 'v1.6.1', registry: { extensions: [entry('anikoto', '1.0.0'), entry('removed', '1.0.0')] } }];
    const { keep, deletable } = retention.planPrune(current, files, supported);

    expect(keep.get('registry/extensions/anikoto/1.0.0.js')).toEqual(['referenced by v1.6.1']);
    expect(keep.has('registry/extensions/removed/1.0.0.js')).toBe(true);
    expect(deletable.map((f: any) => f.file)).toEqual(['registry/extensions/anikoto/1.1.0.js']);
  });

  it('protects nothing for releases whose registry predates published files', () => {
    const legacy = [{ tag: 'v1.6.0', registry: { extensions: [{ id: 'anikoto', main: `${RAW}/dist/x.js` }] } }];
    const { deletable } = retention.planPrune(current, files, legacy);
    expect(deletable).toHaveLength(3);
  });
});
