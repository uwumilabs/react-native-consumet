type Nullable<T> = T | null;

const isASCII = (ch: string) => ch.charCodeAt(0) < 128;

function utf8Encode(str: string): Uint8Array {
  // encode JS string to UTF-8 bytes
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  if (encoder) return encoder.encode(str);
  // fallback
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6));
      bytes.push(0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12));
      bytes.push(0x80 | ((code >> 6) & 0x3f));
      bytes.push(0x80 | (code & 0x3f));
    } else {
      // surrogate pair
      i++;
      const code2 = str.charCodeAt(i);
      const codePoint = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
      bytes.push(0xf0 | (codePoint >> 18));
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function percentEncodeByte(byte: number) {
  return '%' + byte.toString(16).toUpperCase().padStart(2, '0');
}

function encodeComponent(str: string, allow = /[A-Za-z0-9\-._~]/) {
  // encode like encodeURIComponent but allow customizing safe characters (RegExp)
  let out = '';
  const bytes = utf8Encode(str);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    const ch = String.fromCharCode(b);
    if (allow.test(ch)) out += ch;
    else out += percentEncodeByte(b);
  }
  return out;
}

function decodePercentEncoded(str: string) {
  // decode percent-encoded UTF-8 sequences
  try {
    // Replace + with %2B so decodeURIComponent doesn't convert + to space (we treat + literally)
    // but in query strings sometimes + is used for space; we keep literal + behavior.
    return decodeURIComponent(str);
  } catch (e) {
    // Be defensive: fallback to manual decode of %XX bytes into utf8 string
    const bytes: number[] = [];
    for (let i = 0; i < str.length; ) {
      const ch = str[i];
      if (ch === '%' && i + 2 < str.length) {
        const hex = str.substr(i + 1, 2);
        const byte = parseInt(hex, 16);
        if (!Number.isNaN(byte)) {
          bytes.push(byte);
          i += 3;
          continue;
        }
      }
      bytes.push(str.charCodeAt(i));
      i++;
    }
    // decode UTF-8 bytes
    let res = '';
    for (let i = 0; i < bytes.length; ) {
      const b = bytes[i]!;
      if (b < 0x80) {
        res += String.fromCharCode(b);
        i++;
      } else if (b >= 0xc0 && b < 0xe0) {
        const b2 = bytes[i + 1] ?? 0x80;
        const code = ((b & 0x1f) << 6) | (b2 & 0x3f);
        res += String.fromCharCode(code);
        i += 2;
      } else if (b >= 0xe0 && b < 0xf0) {
        const b2 = bytes[i + 1] ?? 0x80;
        const b3 = bytes[i + 2] ?? 0x80;
        const code = ((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
        res += String.fromCharCode(code);
        i += 3;
      } else if (b >= 0xf0) {
        const b2 = bytes[i + 1] ?? 0x80,
          b3 = bytes[i + 2] ?? 0x80,
          b4 = bytes[i + 3] ?? 0x80;
        const codePoint = ((b & 7) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
        const cp = codePoint - 0x10000;
        res += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        i += 4;
      } else {
        i++;
      }
    }
    return res;
  }
}

function isWindowsDrivePath(input: string) {
  return /^[a-zA-Z]:[\\/]/.test(input);
}

// Path normalization utility
function normalizePath(path: string): string {
  if (!path || path === '/') return '/';

  const segments = path.split('/');
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue; // skip empty and current directory
    } else if (segment === '..') {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
        normalized.pop(); // go up one directory
      } else if (!path.startsWith('/')) {
        normalized.push('..'); // relative path, keep ..
      }
    } else {
      normalized.push(segment);
    }
  }

  let result = normalized.join('/');
  if (path.startsWith('/')) result = '/' + result;
  if (path.endsWith('/') && result !== '/') result += '/';

  return result || '/';
}

// Default ports for common protocols
const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
  'ftp:': '21',
  'ftps:': '990',
  'ssh:': '22',
  'ws:': '80',
  'wss:': '443',
};

/* -----------------------------
   URLSearchParams Implementation
   ----------------------------- */

export class URLSearchParams implements Iterable<[string, string]> {
  private _map: Map<string, string[]>;

  constructor(init?: string | Record<string, string> | Array<[string, string]> | URLSearchParams) {
    this._map = new Map();
    if (!init) return;
    if (typeof init === 'string') {
      const s = init.startsWith('?') ? init.slice(1) : init;
      if (s.length === 0) return;
      s.split('&').forEach((pair) => {
        if (pair.length === 0) return;
        const [k, ...rest] = pair.split('=');
        const key = decodePercentEncoded(k!.replace(/\+/g, '%20'))!;
        const val = decodePercentEncoded((rest.join('=') || '').replace(/\+/g, '%20'));
        this.append(key, val);
      });
    } else if (Array.isArray(init)) {
      init.forEach(([k, v]) => this.append(String(k), String(v)));
    } else if (init instanceof URLSearchParams) {
      init.forEach((val, key) => this.append(key, val));
    } else if (typeof init === 'object') {
      Object.keys(init).forEach((k) => this.set(k, init[k]!));
    }
  }

  append(name: string, value: string) {
    const key = String(name);
    const val = String(value);
    const arr = this._map.get(key) || [];
    arr.push(val);
    this._map.set(key, arr);
  }

  set(name: string, value: string) {
    this._map.set(String(name), [String(value)]);
  }

  get(name: string): Nullable<string> {
    const arr = this._map.get(String(name));
    return arr ? arr[0]! : null;
  }

  getAll(name: string): string[] {
    return (this._map.get(String(name)) || []).slice();
  }

  has(name: string): boolean {
    return this._map.has(String(name));
  }

  delete(name: string) {
    this._map.delete(String(name));
  }

  forEach(cb: (value: string, name: string, self: URLSearchParams) => void, thisArg?: any) {
    for (const [k, vals] of this._map) {
      for (const v of vals) cb.call(thisArg, v, k, this);
    }
  }

  toString(): string {
    const out: string[] = [];
    for (const [k, vals] of this._map) {
      for (const v of vals) {
        out.push(`${encodeComponent(k)}=${encodeComponent(v)}`);
      }
    }
    return out.join('&');
  }

  sort() {
    // Stable sort by key (and preserve values order per key)
    const entries = Array.from(this._map.entries()).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    this._map = new Map(entries);
  }

  toJSON() {
    return this.toString();
  }

  clone(): URLSearchParams {
    return new URLSearchParams(this);
  }

  // Additional utility methods
  get size(): number {
    let count = 0;
    for (const [, vals] of this._map) {
      count += vals.length;
    }
    return count;
  }

  clear(): void {
    this._map.clear();
  }

  *entries(): IterableIterator<[string, string]> {
    for (const [k, vals] of this._map) for (const v of vals) yield [k, v];
  }

  *keys(): IterableIterator<string> {
    for (const [k] of this._map) yield k;
  }

  *values(): IterableIterator<string> {
    for (const [, vals] of this._map) for (const v of vals) yield v;
  }

  [Symbol.iterator]() {
    return this.entries();
  }
}

/* -----------------------------
   URL Implementation
   ----------------------------- */

interface ParsedURL {
  protocol: string;
  username: string;
  password: string;
  host: string; // host:port
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
}

const SCHEME_RE = /^([A-Za-z][A-Za-z0-9+.-]*):/;

function splitBeforeFirst(haystack: string, needle: string) {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return [haystack, ''];
  return [haystack.slice(0, idx), haystack.slice(idx + needle.length)];
}

function parseURLString(input: string, base?: ParsedURL): ParsedURL {
  let url = input.trim();

  // Handle data URLs and other special schemes
  if (url.match(/^(data|mailto|tel|sms):/i)) {
    const [scheme, rest] = splitBeforeFirst(url, ':');
    return {
      protocol: scheme!.toLowerCase() + ':',
      username: '',
      password: '',
      host: '',
      hostname: '',
      port: '',
      pathname: rest || '',
      search: '',
      hash: '',
      origin: 'null',
    };
  }

  // If base is provided and url is relative, resolve
  if (base) {
    // handle scheme-relative: //host/path
    if (url.startsWith('//')) {
      url = base.protocol + url;
    } else if (!SCHEME_RE.test(url)) {
      // relative path
      // join base.pathname directory with url
      const basePath = base.pathname;
      let dir = basePath.slice(0, basePath.lastIndexOf('/') + 1);
      if (!dir.endsWith('/')) dir += '/';
      url = `${base.protocol}//${base.host}${dir}${url}`;
    }
  }

  const protocolMatch = url.match(SCHEME_RE);
  const protocol = protocolMatch ? protocolMatch[1]!.toLowerCase() + ':' : '';

  let rest = protocol ? url.slice(protocol.length) : url;

  // If protocol present, remove single leading slashes
  if (protocol) {
    if (rest.startsWith('///')) {
      // weird but handle
      rest = '//' + rest.slice(3);
    }
  }

  // Extract hash
  let [withoutHash, hash] = splitBeforeFirst(rest, '#');
  if (hash) hash = '#' + hash;

  // Extract search
  let [beforeSearch, search] = splitBeforeFirst(withoutHash!, '?');
  if (search) search = '?' + search;

  // authority and path
  let authority = '';
  let pathname = '';
  if (beforeSearch!.startsWith('//')) {
    const afterSlashes = beforeSearch!.slice(2);
    const idx = afterSlashes.indexOf('/');
    if (idx === -1) {
      authority = afterSlashes;
      pathname = '/';
    } else {
      authority = afterSlashes.slice(0, idx);
      pathname = afterSlashes.slice(idx) || '/';
    }
  } else {
    pathname = beforeSearch || '';
  }

  // parse username/password and host/port
  let username = '';
  let password = '';
  let host = '';
  let hostname = '';
  let port = '';

  if (authority) {
    // userinfo@host:port
    const atIdx = authority.lastIndexOf('@');
    let hostport = authority;
    if (atIdx !== -1) {
      const userinfo = authority.slice(0, atIdx);
      hostport = authority.slice(atIdx + 1);
      const [u, p] = splitBeforeFirst(userinfo, ':');
      username = decodePercentEncoded(u!);
      password = p ? decodePercentEncoded(p) : '';
    }
    // IPv6 in [..]:port
    if (hostport.startsWith('[')) {
      const closeIdx = hostport.indexOf(']');
      if (closeIdx !== -1) {
        hostname = hostport.slice(0, closeIdx + 1);
        port = hostport.slice(closeIdx + 1);
        if (port.startsWith(':')) port = port.slice(1);
      } else {
        hostname = hostport; // malformed, but take as hostname
      }
    } else {
      const colonIdx = hostport.lastIndexOf(':');
      if (colonIdx > hostport.indexOf(']')) {
        // normal
      }
      if (colonIdx !== -1 && hostport.indexOf(':') === colonIdx) {
        hostname = hostport.slice(0, colonIdx);
        port = hostport.slice(colonIdx + 1);
      } else {
        hostname = hostport;
      }
    }
    hostname = hostname || '';
    host = port ? `${hostname}:${port}` : hostname;
    host = host.trim();
  }

  // Normalization
  if (!pathname) pathname = '/';
  pathname = normalizePath(decodePercentEncoded(pathname));

  // If hostname present but protocol empty (like relative), try to use base
  let origin = '';
  if (protocol && host) {
    origin = protocol + '//' + host;
  } else if (base && !protocol) {
    origin = base.origin;
  } else if (protocol && !host) {
    origin = protocol + '//';
  }

  return {
    protocol: protocol,
    username,
    password,
    host,
    hostname,
    port,
    pathname,
    search: search || '',
    hash: hash || '',
    origin,
  };
}

export class URL {
  private _p: ParsedURL;
  public searchParams: URLSearchParams;

  constructor(input: string, base?: string | URL) {
    let baseParsed: ParsedURL | undefined;
    if (base instanceof URL) baseParsed = base._p;
    else if (typeof base === 'string' && base.length > 0) baseParsed = parseURLString(base);

    this._p = parseURLString(String(input), baseParsed);
    this.searchParams = new URLSearchParams(this._p.search || '');

    // Bind searchParams changes to update the URL's search property
    this._bindSearchParamsUpdates();
  }

  private _bindSearchParamsUpdates() {
    const origToString = this.searchParams.toString.bind(this.searchParams);
    const self = this;

    // Override methods that change params to update search string
    const mutators = ['append', 'set', 'delete', 'sort', 'clear'];
    for (const m of mutators) {
      const fn = (this.searchParams as any)[m];
      if (typeof fn === 'function') {
        (this.searchParams as any)[m] = function (...args: any[]) {
          const res = fn.apply(this, args);
          const newSearch = origToString();
          self._p.search = newSearch ? '?' + newSearch : '';
          return res;
        };
      }
    }
  }

  // Static helper methods
  static canParse(url: string, base?: string): boolean {
    try {
      new URL(url, base);
      return true;
    } catch {
      return false;
    }
  }

  static parse(url: string, base?: string): URL | null {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  }

  get href() {
    return this.toString();
  }

  set href(val: string) {
    const parsed = parseURLString(String(val));
    this._p = parsed;
    this.searchParams = new URLSearchParams(this._p.search || '');
    this._bindSearchParamsUpdates();
  }

  get protocol() {
    return this._p.protocol;
  }
  set protocol(val: string) {
    const m = String(val).replace(/:$/, '');
    this._p.protocol = m + ':';
    this._updateOrigin();
  }

  get username() {
    return this._p.username;
  }
  set username(v: string) {
    this._p.username = String(v);
  }

  get password() {
    return this._p.password;
  }
  set password(v: string) {
    this._p.password = String(v);
  }

  get host() {
    return this._p.host;
  }
  set host(v: string) {
    const [hostname, port] = splitBeforeFirst(String(v), ':');
    this._p.hostname = hostname!;
    this._p.port = port!;
    this._p.host = port ? `${hostname}:${port}` : hostname!;
    this._updateOrigin();
  }

  get hostname() {
    return this._p.hostname;
  }
  set hostname(v: string) {
    this._p.hostname = String(v);
    this._p.host = this._p.port ? `${this._p.hostname}:${this._p.port}` : this._p.hostname;
    this._updateOrigin();
  }

  get port() {
    return this._p.port;
  }
  set port(v: string) {
    const portStr = String(v);
    // Remove default ports to match browser behavior
    if (DEFAULT_PORTS[this._p.protocol] === portStr) {
      this._p.port = '';
    } else {
      this._p.port = portStr;
    }
    this._p.host = this._p.port ? `${this._p.hostname}:${this._p.port}` : this._p.hostname;
    this._updateOrigin();
  }

  get pathname() {
    return this._p.pathname;
  }
  set pathname(v: string) {
    let path = String(v);
    if (!path.startsWith('/')) path = '/' + path;
    this._p.pathname = normalizePath(path);
  }

  get search() {
    return this._p.search;
  }
  set search(v: string) {
    let search = String(v);
    if (search && !search.startsWith('?')) search = '?' + search;
    this._p.search = search;
    this.searchParams = new URLSearchParams(search || '');
    this._bindSearchParamsUpdates();
  }

  get hash() {
    return this._p.hash;
  }
  set hash(v: string) {
    let hash = String(v);
    if (hash && !hash.startsWith('#')) hash = '#' + hash;
    this._p.hash = hash;
  }

  get origin() {
    return this._p.origin;
  }

  private _updateOrigin() {
    if (this._p.protocol && this._p.hostname) {
      this._p.origin = this._p.protocol + '//' + this._p.host;
    }
  }

  toString() {
    const p = this._p;
    let auth = '';
    if (p.username || p.password) {
      auth = encodeComponent(p.username) + (p.password ? ':' + encodeComponent(p.password) : '') + '@';
    }
    const hostPart = p.host || '';
    const path = p.pathname ? encodeComponentPath(p.pathname) : '/';
    const search =
      p.search || (this.searchParams ? (this.searchParams.toString() ? '?' + this.searchParams.toString() : '') : '');
    const hash = p.hash || '';
    const proto = p.protocol || '';

    // Handle special schemes
    if (proto.match(/^(data|mailto|tel|sms):/i)) {
      return proto + path + search + hash;
    }

    // If protocol uses scheme with no host (like mailto), handle simply
    if (!hostPart && proto && (path === '/' || path === '')) {
      return proto + path + search + hash;
    }
    return proto + '//' + auth + hostPart + path + search + hash;
  }

  toJSON() {
    return this.toString();
  }
}

/* Helper: escape path preserving slashes */
function encodeComponentPath(path: string) {
  // Split on / and encode segments, preserving empty segments for proper // handling
  return path
    .split('/')
    .map((seg) => encodeComponent(seg))
    .join('/');
}

// Export for Node.js environments that might not have these globals
export { URL as PolyURL, URLSearchParams as PolyURLSearchParams };
