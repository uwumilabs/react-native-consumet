// eslint-disable-next-line @typescript-eslint/no-var-requires
const support = require('../../scripts/registry-support');

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
    expect(support.supportedTags(['v1.4.0', 'v1.5.0', 'v1.5.1', 'v1.6.0', 'v1.6.1'])).toEqual([
      'v1.5.0',
      'v1.5.1',
      'v1.6.0',
      'v1.6.1',
    ]);
  });

  it('span a major bump', () => {
    expect(support.supportedTags(['v1.8.0', 'v1.9.0', 'v1.9.2', 'v2.0.0'])).toEqual(['v1.9.0', 'v1.9.2', 'v2.0.0']);
  });
});

describe('versionedPath', () => {
  it('maps published URLs to files and ignores older dist URLs', () => {
    expect(support.versionedPath(`${RAW}/registry/extractors/kwik/1.2.1.js`)).toBe('registry/extractors/kwik/1.2.1.js');
    expect(support.versionedPath(`${RAW}/dist/extractors/kwik.js`)).toBeUndefined();
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
    const { keep, deletable } = support.planPrune(current, files, []);

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
    const { keep, deletable } = support.planPrune(current, files, supported);

    expect(keep.get('registry/extensions/anikoto/1.0.0.js')).toEqual(['referenced by v1.6.1']);
    expect(keep.has('registry/extensions/removed/1.0.0.js')).toBe(true);
    expect(deletable.map((f: any) => f.file)).toEqual(['registry/extensions/anikoto/1.1.0.js']);
  });

  it('protects nothing for releases whose registry predates published files', () => {
    const legacy = [{ tag: 'v1.6.0', registry: { extensions: [{ id: 'anikoto', main: `${RAW}/dist/x.js` }] } }];
    const { deletable } = support.planPrune(current, files, legacy);
    expect(deletable).toHaveLength(3);
  });
});
