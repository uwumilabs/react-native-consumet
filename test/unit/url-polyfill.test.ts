import { PolyURL, PolyURLSearchParams } from '../../src/utils/url-polyfill';

// Node's global URL and URLSearchParams follow the WHATWG URL Standard; the polyfill must match them.
const NodeURL = globalThis.URL;
const NodeURLSearchParams = globalThis.URLSearchParams;

const PROPS = [
  'href',
  'origin',
  'protocol',
  'username',
  'password',
  'host',
  'hostname',
  'port',
  'pathname',
  'search',
  'hash',
] as const;

type Snapshot = { error: string } | Record<string, unknown>;

function snapshotURL(u: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of PROPS) out[p] = u[p];
  out.searchParams = [...u.searchParams];
  out.searchParamsString = u.searchParams.toString();
  out.toString = u.toString();
  out.toJSON = u.toJSON();
  out.json = JSON.stringify({ u });
  return out;
}

// Errors from Node's URL come from another realm, so compare error names rather than classes.
function attempt(fn: () => any, snapshot: (value: any) => Record<string, unknown> = snapshotURL): Snapshot {
  try {
    return snapshot(fn());
  } catch (e: any) {
    return { error: e?.name ?? String(e) };
  }
}

/* -----------------------------
   Inputs (curated from RFC 3986 section 5.4 and WPT urltestdata.json, http(s)-relevant parts)
   ----------------------------- */

const ABSOLUTE = [
  // basics and case
  'https://x.com',
  'https://x.com/',
  'https://x.com/a/b?c=d#e',
  'HTTPS://X.COM/A/B?C=D#E',
  'HtTp://ExAmPlE.CoM/',
  'https://x.com?',
  'https://x.com#',
  'https://x.com/?#',
  'https://x.com/a?b?c#d#e',
  'https:x.com/path',
  'https:/x.com/path',
  'http:///x.com/',
  'http:\\\\x.com\\a\\b',
  'http://x.com\\a\\b',
  // ports
  'http://x.com:80/',
  'https://x.com:443/',
  'http://x.com:443/',
  'https://x.com:80/',
  'https://x.com:8443/p',
  'ws://x.com:80/',
  'wss://x.com:443/',
  'ftp://x.com:21/',
  'http://x.com:/',
  'http://x.com:0/',
  'http://x.com:00080/',
  'http://x.com:65535/',
  'foo://x.com:80/',
  // userinfo
  'https://user:pass@x.com/',
  'https://user@x.com/',
  'https://:pass@x.com/',
  'https://user:@x.com/',
  'http://@x.com/',
  'http://:@x.com/',
  'https://a:b:c@x.com/',
  'https://us er:p@ss@x.com/',
  'https://ü:ö@x.com/',
  'https://a%40b:c%3Ad@x.com/',
  // IPv4
  'http://127.0.0.1/',
  'http://127.1/',
  'http://0x7f.1/',
  'http://0X7F.0.0.1/',
  'http://2130706433/',
  'http://0177.0.0.1/',
  'http://1.2.3.4./',
  'http://0x/',
  'http://4294967295/',
  'http://08.1.1.1/',
  // IPv6
  'http://[::1]/',
  'http://[::1]:8080/',
  'http://[2001:DB8::1]/',
  'http://[2001:db8:0:0:1:0:0:1]/',
  'http://[2001:db8::0:1:0:0:1]/',
  'http://[0:0:0:0:0:0:0:0]/',
  'http://[1:0::]/',
  'http://[1:2:3:4:5:6:7:8]/',
  'http://[::ffff:192.168.0.1]/',
  'http://[::127.0.0.1]/',
  // domains
  'http://EXAMPLE.com./',
  'http://ex%41mple.com/',
  'http://a..b/',
  'http://münchen.de/',
  'http://MÜNCHEN.de/',
  'http://xn--mnchen-3ya.de/',
  'http://faß.de/',
  'http://ＥＸＡＭＰＬＥ．com/',
  'http://日本語。jp/',
  'http://a\u00ADb.com/',
  'http://a\u200Bb.com/',
  'http://ΑΣ.com/',
  // percent-encoding preserved or applied
  'https://x.com/a%2Fb',
  'https://x.com/a%2fb/c%2F',
  'https://x.com/a b',
  'https://x.com/a%20b',
  'https://x.com/ü',
  'https://x.com/%C3%BC',
  'https://x.com/%E2%82%AC',
  'https://x.com/日本',
  'https://x.com/😀',
  'https://x.com/%zz',
  'https://x.com/%',
  'https://x.com/a"b<c>d`e{f}g|h',
  "https://x.com/a,b;c=d:e@f!$&'()*+~",
  'https://x.com/?q=a b&r=ü',
  "https://x.com/?q='",
  "foo://x/?q='",
  'https://x.com/?a"b<c>d`e{f}#g',
  'https://x.com/?a=%2F%zz',
  'https://x.com/#a b',
  'https://x.com/#ü',
  'https://x.com/#a"b<c>d`e{f}',
  'https://x.com/\uD800',
  // dot segments
  'https://x.com/a/./b/../c',
  'https://x.com/a/b/..',
  'https://x.com/a/b/.',
  'https://x.com/../../a',
  'https://x.com/a/%2e%2E/b',
  'https://x.com/a/.%2e',
  'https://x.com/a/%2e./b',
  'https://x.com/a/..%2f',
  'https://x.com/a//b//',
  'https://x.com/./',
  'https://x.com/a/..?q',
  // whitespace and controls
  '  https://x.com/  ',
  'https://x.com/a\tb\nc\rd',
  'https://x\n.com/',
  '\u0000https://x.com/\u001f',
  'https://x.com/a\u0001b',
  // other schemes
  'mailto:someone@example.com',
  'mailto:Someone@Example.com?subject=Hi%20there',
  'data:text/plain,hello world',
  'data:text/html,<p>a</p>',
  'javascript:alert(1)',
  'tel:+1-555-0100',
  'blob:https://x.com/uuid',
  'blob:https://x.com:443/uuid',
  'blob:ftp://x.com/uuid',
  'about:blank',
  'urn:isbn:0451450523',
  'foo://host/path',
  'foo://HOST/Path',
  'foo://host:99/p',
  'foo:/path',
  'foo:path',
  'foo://',
  'foo:///x',
  'foo:/.//x',
  'sc://ñ/x',
  'sc://%/',
  'file:///C:/x',
  'file:///etc/passwd',
  'file://localhost/etc',
  'file://host/share',
  'file:c:\\foo\\bar',
  'git+ssh://git@github.com/org/repo.git',
  'ssh://x.com:22/',
  // invalid
  '',
  '::::',
  'not a url',
  '/foo',
  'foo',
  '//x.com/a',
  '1http://x.com',
  'http://',
  'https://',
  'http:',
  'http://x.com:99999',
  'http://x.com:65536/',
  'http://x.com:8a/',
  'http://[::1',
  'http://[::1::2]/',
  'http://[1:2:3:4:5:6:7:8:9]/',
  'http://[:1]/',
  'http://[::1.2.3]/',
  'http://[1::2:3:4:5:6:7:1.2.3.4]/',
  'http://[::256.0.0.1]/',
  'http://[01.2.3.4::]/',
  'http:// x.com',
  'http://exa mple.com/',
  'http://ex<ample/',
  'http://a%25b.com/',
  'http://%ff.com/',
  'http://x.com\u0000/',
  'http://a@',
  'http://@/',
  'http://user@/x',
  'http://1.2.3.4.5/',
  'http://192.168.0.257/',
  'http://999999999999/',
  'http://4294967296/',
  'http://1.2.3.09/',
  'http://0x100.1/',
  'http://a.0x/',
  'http://\u0080.com/',
  'sc://a b/',
  'sc://a<b/',
];

const BASES = [
  'https://x.com/a/b',
  'https://x.com/a/b/',
  'https://x.com/a/b?q=0#h0',
  'https://x.com',
  'https://user:pw@x.com:8443/a/b/c?x#y',
  'http://a/b/c/d;p?q',
  'foo://host/a/b',
  'file:///C:/dir/file',
  'mailto:a@b.com',
];

const RELATIVE = [
  '/foo',
  'foo',
  '../foo',
  './foo',
  '?q=1',
  '#h',
  '//host/p',
  '',
  ' ',
  '.',
  '..',
  './',
  '../',
  '../..',
  '../../',
  '../../../foo',
  'foo/',
  'foo/./bar/../baz',
  '/./a/../b',
  '?',
  '#',
  '?q=1#h',
  'g:h',
  'g;x',
  'g;x?y#s',
  ';x',
  'g?y/./x',
  'g#s/../x',
  'g.',
  '.g',
  'g..',
  '..g',
  'https://other.com/x',
  'http:foo',
  'https:foo',
  'https:/foo',
  'http:/foo',
  '\\\\host\\p',
  '\\foo',
  '%2e%2e/foo',
  'foo%2Fbar',
  'ü',
  '//',
  '///foo',
  '//user@host:81/p?q#f',
  'C|/x',
  '/C:/x',
  '..\\..\\x',
  ':foo',
];

/*
 * Current-standard results that Node 20 (CI's runtime, Ada 2.9) predates or gets wrong. Node 24 (Ada 4)
 * agrees with each one, so they are checked against these values instead of the running Node.
 */
const SPEC_PARSE_CASES: Array<[string, string | undefined, string | null]> = [
  // `^` is in the path percent-encode set
  ['https://x.com/a^b', undefined, 'https://x.com/a%5Eb'],
  ['file:^', undefined, 'file:///%5E'],
  // a space before `?` or `#` in an opaque path is percent-encoded
  ['data:a b ?x', undefined, 'data:a b%20?x'],
  ['data:a b #x', undefined, 'data:a b%20#x'],
  // `..` cannot climb above the root of a non-special URL either
  ['../..', 'foo://host/a/b', 'foo://host/'],
  // only a fragment-only reference resolves against an opaque-path base
  ['?q=1#h', 'mailto:a@b.com', null],
  ['g;x?y#s', 'mailto:a@b.com', null],
  ['g#s/../x', 'mailto:a@b.com', null],
  ['//user@host:81/p?q#f', 'mailto:a@b.com', null],
];

const SPEC_SETTER_CASES: Array<[string, string, string, string]> = [
  // the host setter keeps the port of a non-special URL and can set an empty host
  ['foo:/p', 'host', 'y.com:8080', 'foo://y.com:8080/p'],
  ['foo:/p', 'host', 'y.com:12abc', 'foo://y.com:12/p'],
  ['foo:/p', 'host', '[::1]:81', 'foo://[::1]:81/p'],
  ['foo:/p', 'host', '', 'foo:///p'],
  ['foo:/p', 'hostname', '', 'foo:///p'],
  ['foo://h/p', 'host', ':', 'foo://h/p'],
  // tabs and newlines are removed first, so these are empty input and change nothing
  ['https://x.com:81/', 'port', '\t', 'https://x.com:81/'],
  ['https://x.com:81/', 'port', '\n', 'https://x.com:81/'],
];

const parseKey = (input: string, base: string | undefined) => JSON.stringify([input, base ?? null]);
const setterKey = (base: string, prop: string, value: string) => JSON.stringify([base, prop, value]);
const SPEC_PARSE_KEYS = new Set(SPEC_PARSE_CASES.map(([input, base]) => parseKey(input, base)));
const SPEC_SETTER_KEYS = new Set(SPEC_SETTER_CASES.map(([base, prop, value]) => setterKey(base, prop, value)));

describe('PolyURL follows the current URL Standard where Node 20 does not', () => {
  it.each(SPEC_PARSE_CASES)('parses %j against base %j', (input, base, href) => {
    expect(PolyURL.parse(input, base)?.href ?? null).toBe(href);
    expect(PolyURL.canParse(input, base)).toBe(href !== null);
  });

  it.each(SPEC_SETTER_CASES)('on %j sets %s = %j', (base, prop, value, href) => {
    const u: any = new PolyURL(base);
    u[prop] = value;
    expect(u.href).toBe(href);
  });

  it('converts a null URLSearchParams init to the string "null", as WebIDL requires', () => {
    expect(new PolyURLSearchParams(null as any).toString()).toBe('null=');
  });
});

describe('PolyURL matches Node URL', () => {
  const cases: Array<[string, string | undefined]> = [
    ...ABSOLUTE.map((input): [string, string | undefined] => [input, undefined]),
    ...BASES.flatMap((base) => RELATIVE.map((ref): [string, string | undefined] => [ref, base])),
  ].filter(([input, base]) => !SPEC_PARSE_KEYS.has(parseKey(input, base)));

  it.each(cases)('parses %j against base %j', (input, base) => {
    const expected = attempt(() => new NodeURL(input, base));
    expect(attempt(() => new PolyURL(input, base))).toEqual(expected);
    expect(PolyURL.canParse(input, base)).toBe(NodeURL.canParse(input, base));
    const parsed = PolyURL.parse(input, base);
    expect(parsed === null ? null : parsed.href).toBe('error' in expected ? null : expected.href);
  });

  it('accepts a PolyURL instance as the base', () => {
    const base = new PolyURL('https://x.com/a/b?q#h');
    expect(new PolyURL('../c', base).href).toBe(new NodeURL('../c', 'https://x.com/a/b?q#h').href);
    expect(PolyURL.canParse('c', base)).toBe(true);
  });

  it.each([[''], ['not a base'], ['/relative'], [null], [123]])('rejects base %j like Node', (base) => {
    expect(attempt(() => new PolyURL('https://x.com/', base as any))).toEqual(
      attempt(() => new NodeURL('https://x.com/', base as any))
    );
    expect(PolyURL.canParse('foo', base as any)).toBe(NodeURL.canParse('foo', base as any));
  });

  it('throws a TypeError for invalid input', () => {
    expect(() => new PolyURL('not a url')).toThrow(TypeError);
    expect(() => new PolyURL('foo', 'not a base')).toThrow(TypeError);
  });

  it('does not need a global URL', () => {
    const saved = { URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams };
    try {
      delete (globalThis as any).URL;
      delete (globalThis as any).URLSearchParams;
      jest.isolateModules(() => {
        const { PolyURL: IsolatedURL } = require('../../src/utils/url-polyfill');
        const u = new IsolatedURL('../x?a=1', 'https://y.com/p/q');
        u.searchParams.append('b', '2 3');
        expect(u.href).toBe('https://y.com/x?a=1&b=2+3');
      });
    } finally {
      Object.assign(globalThis, saved);
    }
  });
});

/* -----------------------------
   SRS UTIL-1 regressions (explicit expectations, independent of Node)
   ----------------------------- */

describe('UTIL-1 known bugs', () => {
  it('resolves an absolute-path reference against the origin, not the base directory', () => {
    expect(new PolyURL('/foo', 'https://x.com/a/b').href).toBe('https://x.com/foo');
    expect(new PolyURL('/foo', 'https://x.com/a/b/').href).toBe('https://x.com/foo');
  });

  it('keeps the whole base path for a query-only reference', () => {
    expect(new PolyURL('?q=1', 'https://x.com/a/b').href).toBe('https://x.com/a/b?q=1');
    expect(new PolyURL('#h', 'https://x.com/a/b?q=0').href).toBe('https://x.com/a/b?q=0#h');
  });

  it('throws a TypeError on invalid input', () => {
    for (const input of ['', 'not a url', '/foo', 'http://', 'http://x.com:99999', 'http://exa mple.com/']) {
      expect(() => new PolyURL(input)).toThrow(TypeError);
    }
  });

  it('canParse rejects "::::" and other invalid input', () => {
    expect(PolyURL.canParse('::::')).toBe(false);
    expect(PolyURL.canParse('not a url')).toBe(false);
    expect(PolyURL.canParse('https://x.com/')).toBe(true);
    expect(PolyURL.parse('::::')).toBeNull();
  });

  it('keeps percent-encoding in the pathname', () => {
    const u = new PolyURL('https://x.com/a%2Fb/c%20d/%E2%82%AC');
    expect(u.pathname).toBe('/a%2Fb/c%20d/%E2%82%AC');
    expect(u.href).toBe('https://x.com/a%2Fb/c%20d/%E2%82%AC');
  });

  it('does not percent-encode sub-delimiters in the path', () => {
    const u = new PolyURL('https://cdn.x.com/hls2/01/abc_,l,n,.urlset/master.m3u8?t=1');
    expect(u.href).toBe('https://cdn.x.com/hls2/01/abc_,l,n,.urlset/master.m3u8?t=1');
  });
});

/* -----------------------------
   Setters
   ----------------------------- */

const SETTER_BASES = [
  'https://user:pw@x.com:8443/a/b?q=1#h',
  'http://x.com/',
  'mailto:a@b.com',
  'foo://host/p',
  'foo:/p',
  'file:///etc/x',
  'data:a b',
];

const SETTER_VALUES: Record<(typeof PROPS)[number] | 'searchParams', string[]> = {
  href: ['https://y.com/z?k=v#f', 'not a url', '/relative', 'HTTP://Y.COM:80/A'],
  origin: [],
  protocol: ['http', 'https:', 'ws', 'ftp', 'foo', 'file', 'HTTP', '1http', 'https:junk', 'mailto'],
  username: ['user', 'us er', 'a@b:c', '', 'ü'],
  password: ['p@ss', 'p:w', '', 'ü'],
  host: ['y.com', 'y.com:8080', 'y.com:99999', 'y.com:12abc', '[::1]:81', '', 'bad host', 'Y.COM', 'y.com/path', 'y.com:'],
  hostname: ['y.com', 'y.com:80', '', '127.0.0.1', '0x7f.1', 'bad host', '[::1]'],
  port: ['8080', '443', '80', '', 'abc', '12abc', '99999', '0', ' 81'],
  pathname: ['/x/y', 'x/y', '/a b', '/a%2Fb', '/../x', '/ü', '/a?b#c', '', '\\x\\y'],
  search: ['a=1', '?a=1', '', '?', 'a b', 'q=ü', '#x', '??a'],
  hash: ['h', '#h', '', '#', 'a b', 'ü', '##'],
  searchParams: [],
};

describe('PolyURL setters match Node URL', () => {
  const cases: Array<[string, string, string]> = [];
  for (const base of SETTER_BASES) {
    for (const [prop, values] of Object.entries(SETTER_VALUES)) {
      for (const value of values) {
        if (!SPEC_SETTER_KEYS.has(setterKey(base, prop, value))) cases.push([base, prop, value]);
      }
    }
  }

  it.each(cases)('on %j sets %s = %j', (base, prop, value) => {
    const run = (Ctor: any) =>
      attempt(() => {
        const u = new Ctor(base);
        const params = u.searchParams;
        u[prop] = value;
        if (u.searchParams !== params) throw new Error('searchParams object replaced');
        return u;
      });
    expect(run(PolyURL)).toEqual(run(NodeURL));
  });

  it('throws a TypeError when href is set to an invalid URL and leaves the URL unchanged', () => {
    const u = new PolyURL('https://x.com/a');
    expect(() => {
      u.href = 'not a url';
    }).toThrow(TypeError);
    expect(u.href).toBe('https://x.com/a');
  });
});

/* -----------------------------
   URL.searchParams stays in sync with the URL
   ----------------------------- */

describe('PolyURL searchParams is live', () => {
  const OPS: Array<[string, (u: any) => void]> = [
    ['append', (u) => u.searchParams.append('a', 'b c+d')],
    ['set existing', (u) => u.searchParams.set('q', '2')],
    ['set new', (u) => u.searchParams.set('n', 'é')],
    ['delete', (u) => u.searchParams.delete('q')],
    ['delete name and value', (u) => u.searchParams.delete('q', '1')],
    ['sort', (u) => u.searchParams.sort()],
    ['search then append', (u) => ((u.search = '?z=1&y=2'), u.searchParams.append('x', '3'))],
    ['href then set', (u) => ((u.href = 'https://y.com/?k=v'), u.searchParams.set('k', 'w'))],
    ['delete everything', (u) => (u.searchParams.delete('q'), u.searchParams.delete('r'), u.searchParams.delete('q'))],
  ];

  it.each(OPS)('%s', (_name, op) => {
    const run = (Ctor: any) =>
      attempt(() => {
        const u = new Ctor('https://x.com/p?q=1&r=%20x&q=3#frag');
        op(u);
        return u;
      });
    expect(run(PolyURL)).toEqual(run(NodeURL));
  });

  it('keeps the same searchParams object after search and href change', () => {
    const u = new PolyURL('https://x.com/?a=1');
    const params = u.searchParams;
    u.search = '?b=2';
    expect(params.get('b')).toBe('2');
    u.href = 'https://y.com/?c=3';
    expect(params.get('c')).toBe('3');
    expect(u.searchParams).toBe(params);
  });
});

/* -----------------------------
   URLSearchParams
   ----------------------------- */

function snapshotParams(p: any): Record<string, unknown> {
  const forEach: Array<[string, string]> = [];
  p.forEach((value: string, name: string) => forEach.push([name, value]));
  return {
    entries: [...p.entries()],
    iterator: [...p],
    keys: [...p.keys()],
    values: [...p.values()],
    forEach,
    size: p.size,
    toString: p.toString(),
  };
}

describe('PolyURLSearchParams matches Node URLSearchParams', () => {
  const STRINGS = [
    'a=1&b=2',
    '?a=1',
    '??a=1',
    '?',
    '',
    'a=1&a=2&b=3&a=4',
    'a',
    'a=',
    '=b',
    '=',
    '&&a=1&&',
    'a=b=c',
    'a+b=c+d',
    'a%20b=c%2Bd',
    'a=%zz&b=%',
    'a=%FF&b=%e2%82',
    'a=%E2%82%AC',
    'ü=ö',
    'a=1;b=2',
    'a=%26b%3Dc',
    "a=!'()*~-._",
    '%61=%62',
    'a=\uD800',
  ];

  it.each(STRINGS)('parses and serializes %j', (init) => {
    expect(attempt(() => new PolyURLSearchParams(init), snapshotParams)).toEqual(
      attempt(() => new NodeURLSearchParams(init), snapshotParams)
    );
  });

  const INITS: Array<[string, unknown]> = [
    ['a record', { a: '1', b: 'x y', c: 'ü' }],
    ['an empty record', {}],
    ['pairs', [['a', '1'], ['a', '2'], ['b', 'x+y']]],
    ['empty pairs', []],
    ['a URLSearchParams', new PolyURLSearchParams('a=1&b=2&a=3')],
    ['a pair of the wrong length', [['a']]],
    ['a pair with three items', [['a', 'b', 'c']]],
    ['a string pair', ['ab']],
    ['undefined', undefined],
    ['a number', 12],
  ];

  it.each(INITS)('accepts %s like Node', (_name, init) => {
    const nodeInit = init instanceof PolyURLSearchParams ? new NodeURLSearchParams(init.toString()) : init;
    expect(attempt(() => new PolyURLSearchParams(init as any), snapshotParams)).toEqual(
      attempt(() => new NodeURLSearchParams(nodeInit as any), snapshotParams)
    );
  });

  it.each([
    [' '],
    ['+'],
    ['&'],
    ['='],
    ['%'],
    ['~'],
    ['*-._'],
    ["!'()"],
    ['ü€😀'],
    ['a\nb'],
    ['a/b?c#d'],
    ['\uDC00'],
  ])('serializes %j', (text) => {
    const run = (Ctor: any) => {
      const p = new Ctor();
      p.append(text, text);
      return snapshotParams(p);
    };
    expect(run(PolyURLSearchParams)).toEqual(run(NodeURLSearchParams));
  });

  it('decodes + as a space and %2B as a plus, and encodes a space as +', () => {
    const p = new PolyURLSearchParams('a=b+c&d=e%2Bf&g=h%20i');
    expect(p.get('a')).toBe('b c');
    expect(p.get('d')).toBe('e+f');
    expect(p.get('g')).toBe('h i');
    expect(p.toString()).toBe('a=b+c&d=e%2Bf&g=h+i');
  });

  const METHOD_OPS: Array<[string, (p: any) => unknown]> = [
    ['append keeps insertion order', (p) => (p.append('b', '9'), p.append('a', '8'))],
    ['set replaces the first and removes the rest', (p) => p.set('a', 'x')],
    ['set appends a new name', (p) => p.set('z', 'x')],
    ['delete removes every pair with the name', (p) => p.delete('a')],
    ['delete with a value removes only that pair', (p) => p.delete('a', '3')],
    ['delete of a missing name', (p) => p.delete('missing')],
    ['get', (p) => [p.get('a'), p.get('b'), p.get('missing'), p.get('')]],
    ['getAll', (p) => [p.getAll('a'), p.getAll('missing')]],
    ['has', (p) => [p.has('a'), p.has('missing'), p.has('a', '3'), p.has('a', 'nope')]],
    ['sort is stable', (p) => (p.append('B', '0'), p.append('a', '0'), p.sort())],
    ['sort compares code units', (p) => (p.append('é', '1'), p.append('z', '1'), p.append('\uD83D\uDE00', '1'), p.sort())],
    ['names and values are converted to strings', (p) => (p.append(1 as any, 2 as any), p.set(true as any, null as any))],
  ];

  it.each(METHOD_OPS)('%s', (_name, op) => {
    const run = (Ctor: any) =>
      attempt(
        () => {
          const p = new Ctor('a=1&b=2&a=3&c=&a=4');
          const result = op(p);
          return { result, params: p };
        },
        ({ result, params }) => ({ result, ...snapshotParams(params) })
      );
    expect(run(PolyURLSearchParams)).toEqual(run(NodeURLSearchParams));
  });

  it('keeps the non-standard helpers', () => {
    const p = new PolyURLSearchParams('a=1&b=2');
    const copy = p.clone();
    copy.append('c', '3');
    expect(p.toString()).toBe('a=1&b=2');
    expect(copy.toString()).toBe('a=1&b=2&c=3');
    expect(p.toJSON()).toBe('a=1&b=2');
    p.clear();
    expect(p.size).toBe(0);
    expect(p.toString()).toBe('');
  });

  it('clear on a URL searchParams removes the query', () => {
    const u = new PolyURL('https://x.com/?a=1#h');
    u.searchParams.clear();
    expect(u.href).toBe('https://x.com/#h');
  });
});
