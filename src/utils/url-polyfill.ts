/**
 * WHATWG URL and URLSearchParams for Hermes, whose global URL support is incomplete.
 *
 * Extensions get these as `ctx.PolyURL` / `ctx.PolyURLSearchParams`, so every provider and extractor
 * inherits their behaviour. The parser follows the URL Standard (https://url.spec.whatwg.org/) state
 * machine, and test/unit/url-polyfill.test.ts checks it against Node's URL. It never uses a global URL.
 *
 * Known gap: hosts are mapped with NFKC, lower-casing and punycode instead of the full UTS #46 table,
 * so exotic internationalised domain names can differ from a browser.
 */

type Nullable<T> = T | null;

const EOF = -1;

/* -----------------------------
   Code points, UTF-8 and percent-encoding
   ----------------------------- */

// The code points of a string, with lone surrogates replaced by U+FFFD (USVString conversion).
function toCodePoints(input: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < input.length) {
      const d = input.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        out.push(0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00));
        i++;
        continue;
      }
    }
    out.push(c >= 0xd800 && c <= 0xdfff ? 0xfffd : c);
  }
  return out;
}

function fromCodePoints(codePoints: number[]): string {
  let out = '';
  for (const cp of codePoints) out += String.fromCodePoint(cp);
  return out;
}

function utf8EncodeCodePoint(cp: number, bytes: number[]) {
  if (cp < 0x80) {
    bytes.push(cp);
  } else if (cp < 0x800) {
    bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
  } else if (cp < 0x10000) {
    bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  } else {
    bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
}

function utf8Encode(input: string): number[] {
  const bytes: number[] = [];
  for (const cp of toCodePoints(input)) utf8EncodeCodePoint(cp, bytes);
  return bytes;
}

// UTF-8 decode without BOM, replacing invalid sequences with U+FFFD (WHATWG Encoding).
function utf8Decode(bytes: number[]): string {
  const out: number[] = [];
  let codePoint = 0;
  let bytesSeen = 0;
  let bytesNeeded = 0;
  let lower = 0x80;
  let upper = 0xbf;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    if (bytesNeeded === 0) {
      if (byte <= 0x7f) {
        out.push(byte);
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        bytesNeeded = 1;
        codePoint = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lower = 0xa0;
        if (byte === 0xed) upper = 0x9f;
        bytesNeeded = 2;
        codePoint = byte & 0xf;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lower = 0x90;
        if (byte === 0xf4) upper = 0x8f;
        bytesNeeded = 3;
        codePoint = byte & 0x7;
      } else {
        out.push(0xfffd);
      }
      continue;
    }
    if (byte < lower || byte > upper) {
      codePoint = bytesNeeded = bytesSeen = 0;
      lower = 0x80;
      upper = 0xbf;
      out.push(0xfffd);
      i--; // reprocess this byte
      continue;
    }
    lower = 0x80;
    upper = 0xbf;
    codePoint = (codePoint << 6) | (byte & 0x3f);
    bytesSeen++;
    if (bytesSeen === bytesNeeded) {
      out.push(codePoint);
      codePoint = bytesNeeded = bytesSeen = 0;
    }
  }
  if (bytesNeeded !== 0) out.push(0xfffd);
  return fromCodePoints(out);
}

const isASCIIDigit = (c: number) => c >= 0x30 && c <= 0x39;
const isASCIIAlpha = (c: number) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
const isASCIIAlphanumeric = (c: number) => isASCIIDigit(c) || isASCIIAlpha(c);
const isASCIIHex = (c: number) => isASCIIDigit(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
const lowerASCII = (c: number) => (c >= 0x41 && c <= 0x5a ? c + 0x20 : c);

function isASCII(input: string): boolean {
  for (let i = 0; i < input.length; i++) if (input.charCodeAt(i) > 0x7f) return false;
  return true;
}

// Remove leading and trailing C0 controls and spaces.
function trimC0ControlOrSpace(input: string): string {
  let start = 0;
  let end = input.length;
  while (start < end && input.charCodeAt(start) <= 0x20) start++;
  while (end > start && input.charCodeAt(end - 1) <= 0x20) end--;
  return input.slice(start, end);
}

// Percent-encode sets, as predicates on a code point. Each set extends another with ASCII characters.
type EncodeSet = (c: number) => boolean;

function charTable(chars: string): boolean[] {
  const table: boolean[] = [];
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = true;
  return table;
}

function extendSet(base: EncodeSet, chars: string): EncodeSet {
  const table = charTable(chars);
  return (c) => base(c) || table[c] === true;
}

const inC0ControlSet: EncodeSet = (c) => c <= 0x1f || c > 0x7e;
const inFragmentSet = extendSet(inC0ControlSet, ' "<>`');
const inQuerySet = extendSet(inC0ControlSet, ' "#<>');
const inSpecialQuerySet = extendSet(inQuerySet, "'");
const inPathSet = extendSet(inQuerySet, '?^`{}');
const inUserinfoSet = extendSet(inPathSet, '/:;=@[\\]|');
const inComponentSet = extendSet(inUserinfoSet, '$%&+,');
const inFormSet = extendSet(inComponentSet, "!'()~");

function percentEncodeCodePoint(cp: number, set: EncodeSet): string {
  if (!set(cp)) return String.fromCodePoint(cp);
  const bytes: number[] = [];
  utf8EncodeCodePoint(cp, bytes);
  let out = '';
  for (const b of bytes) out += '%' + (b < 0x10 ? '0' : '') + b.toString(16).toUpperCase();
  return out;
}

function percentEncodeString(input: string, set: EncodeSet, spaceAsPlus = false): string {
  let out = '';
  for (const cp of toCodePoints(input)) out += spaceAsPlus && cp === 0x20 ? '+' : percentEncodeCodePoint(cp, set);
  return out;
}

// Percent-decode a string into bytes; a `%` not followed by two hex digits stays as is.
function percentDecode(input: string): number[] {
  const bytes = utf8Encode(input);
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 0x25 && i + 2 < bytes.length && isASCIIHex(bytes[i + 1]!) && isASCIIHex(bytes[i + 2]!)) {
      out.push(parseInt(String.fromCharCode(bytes[i + 1]!, bytes[i + 2]!), 16));
      i += 2;
    } else {
      out.push(b);
    }
  }
  return out;
}

/* -----------------------------
   application/x-www-form-urlencoded
   ----------------------------- */

function parseFormUrlencoded(input: string): Array<[string, string]> {
  const decode = (s: string) => utf8Decode(percentDecode(s.replace(/\+/g, ' ')));
  const out: Array<[string, string]> = [];
  for (const sequence of input.split('&')) {
    if (sequence === '') continue;
    const eq = sequence.indexOf('=');
    const name = eq === -1 ? sequence : sequence.slice(0, eq);
    const value = eq === -1 ? '' : sequence.slice(eq + 1);
    out.push([decode(name), decode(value)]);
  }
  return out;
}

function serializeFormUrlencoded(list: Array<[string, string]>): string {
  return list
    .map(
      ([name, value]) => `${percentEncodeString(name, inFormSet, true)}=${percentEncodeString(value, inFormSet, true)}`
    )
    .join('&');
}

/* -----------------------------
   Hosts
   ----------------------------- */

const FORBIDDEN_HOST_CODE_POINTS = charTable('\u0000\t\n\r #/:<>?@[\\]^|');
const isForbiddenHostCodePoint = (c: number) => FORBIDDEN_HOST_CODE_POINTS[c] === true;
const isForbiddenDomainCodePoint = (c: number) => isForbiddenHostCodePoint(c) || c <= 0x1f || c === 0x25 || c === 0x7f;

function parseIPv4Number(input: string): number | null {
  if (input === '') return null;
  let radix = 10;
  if (input.length >= 2 && input[0] === '0' && (input[1] === 'x' || input[1] === 'X')) {
    input = input.slice(2);
    radix = 16;
  } else if (input.length >= 2 && input[0] === '0') {
    input = input.slice(1);
    radix = 8;
  }
  if (input === '') return 0;
  const digits = radix === 10 ? /^[0-9]+$/ : radix === 16 ? /^[0-9A-Fa-f]+$/ : /^[0-7]+$/;
  if (!digits.test(input)) return null;
  return parseInt(input, radix);
}

function endsInANumber(input: string): boolean {
  const parts = input.split('.');
  if (parts[parts.length - 1] === '') {
    if (parts.length === 1) return false;
    parts.pop();
  }
  const last = parts[parts.length - 1]!;
  if (/^[0-9]+$/.test(last)) return true;
  return parseIPv4Number(last) !== null;
}

function parseIPv4(input: string): string | null {
  const parts = input.split('.');
  if (parts[parts.length - 1] === '' && parts.length > 1) parts.pop();
  if (parts.length > 4) return null;
  const numbers: number[] = [];
  for (const part of parts) {
    const n = parseIPv4Number(part);
    if (n === null) return null;
    numbers.push(n);
  }
  for (let i = 0; i < numbers.length - 1; i++) if (numbers[i]! > 255) return null;
  let ipv4 = numbers[numbers.length - 1]!;
  if (ipv4 >= Math.pow(256, 5 - numbers.length)) return null;
  for (let i = 0; i < numbers.length - 1; i++) ipv4 += numbers[i]! * Math.pow(256, 3 - i);
  let out = '';
  for (let i = 0; i < 4; i++) {
    out = String(ipv4 % 256) + (i === 0 ? '' : '.') + out;
    ipv4 = Math.floor(ipv4 / 256);
  }
  return out;
}

function parseIPv6(input: string): number[] | null {
  const cps = toCodePoints(input);
  const at = (i: number) => (i < cps.length ? cps[i]! : EOF);
  const address = [0, 0, 0, 0, 0, 0, 0, 0];
  let pieceIndex = 0;
  let compress: number | null = null;
  let pointer = 0;

  if (at(pointer) === 0x3a) {
    if (at(pointer + 1) !== 0x3a) return null;
    pointer += 2;
    compress = ++pieceIndex;
  }
  while (at(pointer) !== EOF) {
    if (pieceIndex === 8) return null;
    if (at(pointer) === 0x3a) {
      if (compress !== null) return null;
      pointer++;
      compress = ++pieceIndex;
      continue;
    }
    let value = 0;
    let length = 0;
    while (length < 4 && isASCIIHex(at(pointer))) {
      value = value * 0x10 + parseInt(String.fromCharCode(at(pointer)), 16);
      pointer++;
      length++;
    }
    if (at(pointer) === 0x2e) {
      // Embedded IPv4 address
      if (length === 0) return null;
      pointer -= length;
      if (pieceIndex > 6) return null;
      let numbersSeen = 0;
      while (at(pointer) !== EOF) {
        let ipv4Piece: number | null = null;
        if (numbersSeen > 0) {
          if (at(pointer) === 0x2e && numbersSeen < 4) pointer++;
          else return null;
        }
        if (!isASCIIDigit(at(pointer))) return null;
        while (isASCIIDigit(at(pointer))) {
          const n = at(pointer) - 0x30;
          if (ipv4Piece === null) ipv4Piece = n;
          else if (ipv4Piece === 0) return null;
          else ipv4Piece = ipv4Piece * 10 + n;
          if (ipv4Piece > 255) return null;
          pointer++;
        }
        address[pieceIndex] = address[pieceIndex]! * 0x100 + ipv4Piece!;
        numbersSeen++;
        if (numbersSeen === 2 || numbersSeen === 4) pieceIndex++;
      }
      if (numbersSeen !== 4) return null;
      break;
    } else if (at(pointer) === 0x3a) {
      pointer++;
      if (at(pointer) === EOF) return null;
    } else if (at(pointer) !== EOF) {
      return null;
    }
    address[pieceIndex] = value;
    pieceIndex++;
  }
  if (compress !== null) {
    let swaps = pieceIndex - compress;
    pieceIndex = 7;
    while (pieceIndex !== 0 && swaps > 0) {
      const other = compress + swaps - 1;
      const tmp = address[other]!;
      address[other] = address[pieceIndex]!;
      address[pieceIndex] = tmp;
      pieceIndex--;
      swaps--;
    }
  } else if (pieceIndex !== 8) {
    return null;
  }
  return address;
}

function serializeIPv6(address: number[]): string {
  // Compress the first longest run of two or more zero pieces.
  let compress: number | null = null;
  let longest = 1;
  for (let i = 0; i < 8; ) {
    if (address[i] !== 0) {
      i++;
      continue;
    }
    let end = i;
    while (end < 8 && address[end] === 0) end++;
    if (end - i > longest) {
      longest = end - i;
      compress = i;
    }
    i = end;
  }
  let out = '';
  let ignore0 = false;
  for (let i = 0; i < 8; i++) {
    if (ignore0 && address[i] === 0) continue;
    ignore0 = false;
    if (compress === i) {
      out += i === 0 ? '::' : ':';
      ignore0 = true;
      continue;
    }
    out += address[i]!.toString(16);
    if (i !== 7) out += ':';
  }
  return out;
}

// Code points UTS #46 maps to nothing (soft hyphen, zero-width space and joiners, variation selectors, BOM).
const IGNORED_IN_DOMAINS = /[\u00AD\u034F\u180B-\u180F\u200B\u2060\u2064\uFE00-\uFE0F\uFEFF]/g;

function normalizeUnicode(input: string, form: 'NFC' | 'NFKC'): string {
  try {
    return typeof input.normalize === 'function' ? input.normalize(form) : input;
  } catch {
    return input;
  }
}

function punycodeEncode(input: number[]): string {
  const base = 36;
  const tMin = 1;
  const tMax = 26;
  const digit = (d: number) => String.fromCharCode(d < 26 ? 0x61 + d : 0x16 + d);
  const adapt = (delta: number, numPoints: number, firstTime: boolean) => {
    delta = firstTime ? Math.floor(delta / 700) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + 38));
  };

  let out = '';
  for (const cp of input) if (cp < 0x80) out += String.fromCharCode(cp);
  const basicLength = out.length;
  let handled = basicLength;
  if (basicLength > 0) out += '-';
  let n = 0x80;
  let delta = 0;
  let bias = 72;
  while (handled < input.length) {
    let m = Infinity;
    for (const cp of input) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (handled + 1);
    n = m;
    for (const cp of input) {
      if (cp < n) delta++;
      if (cp === n) {
        let q = delta;
        for (let k = base; ; k += base) {
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (q < t) break;
          out += digit(t + ((q - t) % (base - t)));
          q = Math.floor((q - t) / (base - t));
        }
        out += digit(q);
        bias = adapt(delta, handled + 1, handled === basicLength);
        delta = 0;
        handled++;
      }
    }
    delta++;
    n++;
  }
  return out;
}

// Domain to ASCII. ASCII input is lower-cased; other input gets an approximation of UTS #46 mapping
// (ignored code points removed, NFKC, per-code-point lower case, NFC) and punycode per label.
function domainToASCII(domain: string): string | null {
  let result: string;
  if (isASCII(domain)) {
    result = domain.replace(/[A-Z]+/g, (m) => m.toLowerCase());
  } else {
    let mapped = normalizeUnicode(domain.replace(IGNORED_IN_DOMAINS, ''), 'NFKC');
    mapped = normalizeUnicode(toCodePoints(mapped).map(toLowerCodePoint).join(''), 'NFC');
    mapped = mapped.replace(/[\u3002\uFF0E\uFF61]/g, '.');
    // U+FFFD comes from invalid percent-encoded UTF-8; C1 controls are disallowed too.
    if (/[\u0080-\u009f\uFFFD]/.test(mapped)) return null;
    result = mapped
      .split('.')
      .map((label) => (isASCII(label) ? label : 'xn--' + punycodeEncode(toCodePoints(label))))
      .join('.');
  }
  if (result === '') return null;
  for (let i = 0; i < result.length; i++) if (isForbiddenDomainCodePoint(result.charCodeAt(i))) return null;
  return result;
}

function toLowerCodePoint(cp: number): string {
  return String.fromCodePoint(cp).toLowerCase();
}

// Parse a host; returns the serialized host or null on failure.
function parseHost(input: string, isOpaque: boolean): string | null {
  if (input.startsWith('[')) {
    if (!input.endsWith(']')) return null;
    const address = parseIPv6(input.slice(1, -1));
    return address ? `[${serializeIPv6(address)}]` : null;
  }
  if (isOpaque) {
    for (const cp of toCodePoints(input)) if (isForbiddenHostCodePoint(cp)) return null;
    return percentEncodeString(input, inC0ControlSet);
  }
  const asciiDomain = domainToASCII(utf8Decode(percentDecode(input)));
  if (asciiDomain === null) return null;
  if (endsInANumber(asciiDomain)) return parseIPv4(asciiDomain);
  return asciiDomain;
}

/* -----------------------------
   URL records and the basic URL parser
   ----------------------------- */

interface URLRecord {
  scheme: string;
  username: string;
  password: string;
  host: string | null; // serialized host
  port: number | null;
  path: string[] | string; // a string is an opaque path (e.g. mailto:, data:)
  query: string | null;
  fragment: string | null;
}

// Special schemes and their default ports (file has none).
function specialSchemePort(scheme: string): number | null | undefined {
  switch (scheme) {
    case 'ftp':
      return 21;
    case 'http':
    case 'ws':
      return 80;
    case 'https':
    case 'wss':
      return 443;
    case 'file':
      return null;
    default:
      return undefined;
  }
}

const isSpecialScheme = (scheme: string) => specialSchemePort(scheme) !== undefined;
const includesCredentials = (url: URLRecord) => url.username !== '' || url.password !== '';
const cannotHaveCredentialsOrPort = (url: URLRecord) => url.host === null || url.host === '' || url.scheme === 'file';

const isWindowsDriveLetter = (s: string) => /^[A-Za-z][:|]$/.test(s);
const isNormalizedWindowsDriveLetter = (s: string) => /^[A-Za-z]:$/.test(s);
const isSingleDotSegment = (s: string) => s === '.' || s.toLowerCase() === '%2e';
const isDoubleDotSegment = (s: string) => {
  const lower = s.toLowerCase();
  return lower === '..' || lower === '.%2e' || lower === '%2e.' || lower === '%2e%2e';
};

function startsWithWindowsDriveLetter(cps: number[], pointer: number): boolean {
  if (cps.length - pointer < 2) return false;
  const first = cps[pointer]!;
  const second = cps[pointer + 1]!;
  if (!isASCIIAlpha(first) || (second !== 0x3a && second !== 0x7c)) return false;
  if (cps.length - pointer === 2) return true;
  const third = cps[pointer + 2]!;
  return third === 0x2f || third === 0x5c || third === 0x3f || third === 0x23;
}

function pathList(url: URLRecord): string[] {
  if (typeof url.path === 'string') url.path = [];
  return url.path;
}

function shortenPath(url: URLRecord) {
  const path = pathList(url);
  if (url.scheme === 'file' && path.length === 1 && isNormalizedWindowsDriveLetter(path[0]!)) return;
  path.pop();
}

// Parser states
const SCHEME_START = 1;
const SCHEME = 2;
const NO_SCHEME = 3;
const SPECIAL_RELATIVE_OR_AUTHORITY = 4;
const PATH_OR_AUTHORITY = 5;
const RELATIVE = 6;
const RELATIVE_SLASH = 7;
const SPECIAL_AUTHORITY_SLASHES = 8;
const SPECIAL_AUTHORITY_IGNORE_SLASHES = 9;
const AUTHORITY = 10;
const HOST = 11;
const HOSTNAME = 12;
const PORT = 13;
const FILE = 14;
const FILE_SLASH = 15;
const FILE_HOST = 16;
const PATH_START = 17;
const PATH = 18;
const OPAQUE_PATH = 19;
const QUERY = 20;
const FRAGMENT = 21;

/**
 * The URL Standard's basic URL parser. Returns the URL record, or null on failure. With `url` and
 * `stateOverride` (used by the setters) it modifies `url` in place.
 */
function basicURLParse(
  input: string,
  base: URLRecord | null,
  url?: URLRecord,
  stateOverride?: number
): URLRecord | null {
  let record: URLRecord;
  if (url) {
    record = url;
  } else {
    record = { scheme: '', username: '', password: '', host: null, port: null, path: [], query: null, fragment: null };
    input = trimC0ControlOrSpace(input);
  }
  input = input.replace(/[\t\n\r]/g, '');

  const cps = toCodePoints(input);
  const special = () => isSpecialScheme(record.scheme);
  let state = stateOverride || SCHEME_START;
  let buffer = '';
  let atSignSeen = false;
  let insideBrackets = false;
  let passwordTokenSeen = false;

  for (let pointer = 0; pointer <= cps.length; pointer++) {
    const c = pointer < cps.length ? cps[pointer]! : EOF;
    const next = pointer + 1 < cps.length ? cps[pointer + 1]! : EOF;

    switch (state) {
      case SCHEME_START:
        if (isASCIIAlpha(c)) {
          buffer += String.fromCharCode(lowerASCII(c));
          state = SCHEME;
        } else if (!stateOverride) {
          state = NO_SCHEME;
          pointer--;
        } else {
          return null;
        }
        break;

      case SCHEME:
        if (isASCIIAlphanumeric(c) || c === 0x2b || c === 0x2d || c === 0x2e) {
          buffer += String.fromCharCode(lowerASCII(c));
        } else if (c === 0x3a) {
          if (stateOverride) {
            if (isSpecialScheme(record.scheme) !== isSpecialScheme(buffer)) return record;
            if ((includesCredentials(record) || record.port !== null) && buffer === 'file') return record;
            if (record.scheme === 'file' && record.host === '') return record;
          }
          record.scheme = buffer;
          if (stateOverride) {
            if (record.port === specialSchemePort(record.scheme)) record.port = null;
            return record;
          }
          buffer = '';
          if (record.scheme === 'file') {
            state = FILE;
          } else if (special() && base && base.scheme === record.scheme) {
            state = SPECIAL_RELATIVE_OR_AUTHORITY;
          } else if (special()) {
            state = SPECIAL_AUTHORITY_SLASHES;
          } else if (next === 0x2f) {
            state = PATH_OR_AUTHORITY;
            pointer++;
          } else {
            record.path = '';
            state = OPAQUE_PATH;
          }
        } else if (!stateOverride) {
          buffer = '';
          state = NO_SCHEME;
          pointer = -1; // start over
        } else {
          return null;
        }
        break;

      case NO_SCHEME:
        if (!base || (typeof base.path === 'string' && c !== 0x23)) {
          return null;
        } else if (typeof base.path === 'string' && c === 0x23) {
          record.scheme = base.scheme;
          record.path = base.path;
          record.query = base.query;
          record.fragment = '';
          state = FRAGMENT;
        } else if (base.scheme !== 'file') {
          state = RELATIVE;
          pointer--;
        } else {
          state = FILE;
          pointer--;
        }
        break;

      case SPECIAL_RELATIVE_OR_AUTHORITY:
        if (c === 0x2f && next === 0x2f) {
          state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
          pointer++;
        } else {
          state = RELATIVE;
          pointer--;
        }
        break;

      case PATH_OR_AUTHORITY:
        if (c === 0x2f) {
          state = AUTHORITY;
        } else {
          state = PATH;
          pointer--;
        }
        break;

      case RELATIVE:
        record.scheme = base!.scheme;
        if (c === 0x2f || (special() && c === 0x5c)) {
          state = RELATIVE_SLASH;
        } else {
          record.username = base!.username;
          record.password = base!.password;
          record.host = base!.host;
          record.port = base!.port;
          record.path = typeof base!.path === 'string' ? base!.path : base!.path.slice();
          record.query = base!.query;
          if (c === 0x3f) {
            record.query = '';
            state = QUERY;
          } else if (c === 0x23) {
            record.fragment = '';
            state = FRAGMENT;
          } else if (c !== EOF) {
            record.query = null;
            shortenPath(record);
            state = PATH;
            pointer--;
          }
        }
        break;

      case RELATIVE_SLASH:
        if (special() && (c === 0x2f || c === 0x5c)) {
          state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
        } else if (c === 0x2f) {
          state = AUTHORITY;
        } else {
          record.username = base!.username;
          record.password = base!.password;
          record.host = base!.host;
          record.port = base!.port;
          state = PATH;
          pointer--;
        }
        break;

      case SPECIAL_AUTHORITY_SLASHES:
        state = SPECIAL_AUTHORITY_IGNORE_SLASHES;
        if (c === 0x2f && next === 0x2f) pointer++;
        else pointer--;
        break;

      case SPECIAL_AUTHORITY_IGNORE_SLASHES:
        if (c !== 0x2f && c !== 0x5c) {
          state = AUTHORITY;
          pointer--;
        }
        break;

      case AUTHORITY:
        if (c === 0x40) {
          if (atSignSeen) buffer = '%40' + buffer;
          atSignSeen = true;
          for (const bc of toCodePoints(buffer)) {
            if (bc === 0x3a && !passwordTokenSeen) {
              passwordTokenSeen = true;
              continue;
            }
            const encoded = percentEncodeCodePoint(bc, inUserinfoSet);
            if (passwordTokenSeen) record.password += encoded;
            else record.username += encoded;
          }
          buffer = '';
        } else if (c === EOF || c === 0x2f || c === 0x3f || c === 0x23 || (special() && c === 0x5c)) {
          if (atSignSeen && buffer === '') return null;
          pointer -= toCodePoints(buffer).length + 1;
          buffer = '';
          state = HOST;
        } else {
          buffer += String.fromCodePoint(c);
        }
        break;

      case HOST:
      case HOSTNAME:
        if (stateOverride && record.scheme === 'file') {
          pointer--;
          state = FILE_HOST;
        } else if (c === 0x3a && !insideBrackets) {
          if (buffer === '') return null;
          if (stateOverride === HOSTNAME) return null;
          const host = parseHost(buffer, !special());
          if (host === null) return null;
          record.host = host;
          buffer = '';
          state = PORT;
        } else if (c === EOF || c === 0x2f || c === 0x3f || c === 0x23 || (special() && c === 0x5c)) {
          pointer--;
          if (special() && buffer === '') return null;
          if (stateOverride && buffer === '' && (includesCredentials(record) || record.port !== null)) return null;
          const host = parseHost(buffer, !special());
          if (host === null) return null;
          record.host = host;
          buffer = '';
          state = PATH_START;
          if (stateOverride) return record;
        } else {
          if (c === 0x5b) insideBrackets = true;
          if (c === 0x5d) insideBrackets = false;
          buffer += String.fromCodePoint(c);
        }
        break;

      case PORT:
        if (isASCIIDigit(c)) {
          buffer += String.fromCharCode(c);
        } else if (c === EOF || c === 0x2f || c === 0x3f || c === 0x23 || (special() && c === 0x5c) || stateOverride) {
          if (buffer !== '') {
            const port = parseInt(buffer, 10);
            if (port > 65535) return null;
            record.port = port === specialSchemePort(record.scheme) ? null : port;
            buffer = '';
            if (stateOverride) return record;
          }
          if (stateOverride) return null;
          state = PATH_START;
          pointer--;
        } else {
          return null;
        }
        break;

      case FILE:
        record.scheme = 'file';
        record.host = '';
        if (c === 0x2f || c === 0x5c) {
          state = FILE_SLASH;
        } else if (base && base.scheme === 'file') {
          record.host = base.host;
          record.path = typeof base.path === 'string' ? base.path : base.path.slice();
          record.query = base.query;
          if (c === 0x3f) {
            record.query = '';
            state = QUERY;
          } else if (c === 0x23) {
            record.fragment = '';
            state = FRAGMENT;
          } else if (c !== EOF) {
            record.query = null;
            if (!startsWithWindowsDriveLetter(cps, pointer)) shortenPath(record);
            else record.path = [];
            state = PATH;
            pointer--;
          }
        } else {
          state = PATH;
          pointer--;
        }
        break;

      case FILE_SLASH:
        if (c === 0x2f || c === 0x5c) {
          state = FILE_HOST;
        } else {
          if (base && base.scheme === 'file') {
            record.host = base.host;
            const basePath = base.path;
            if (
              !startsWithWindowsDriveLetter(cps, pointer) &&
              typeof basePath !== 'string' &&
              basePath.length > 0 &&
              isNormalizedWindowsDriveLetter(basePath[0]!)
            ) {
              pathList(record).push(basePath[0]!);
            }
          }
          state = PATH;
          pointer--;
        }
        break;

      case FILE_HOST:
        if (c === EOF || c === 0x2f || c === 0x5c || c === 0x3f || c === 0x23) {
          pointer--;
          if (!stateOverride && isWindowsDriveLetter(buffer)) {
            state = PATH; // the buffer is kept and becomes the first path segment
          } else if (buffer === '') {
            record.host = '';
            if (stateOverride) return record;
            state = PATH_START;
          } else {
            let host = parseHost(buffer, !special());
            if (host === null) return null;
            if (host === 'localhost') host = '';
            record.host = host;
            if (stateOverride) return record;
            buffer = '';
            state = PATH_START;
          }
        } else {
          buffer += String.fromCodePoint(c);
        }
        break;

      case PATH_START:
        if (special()) {
          state = PATH;
          if (c !== 0x2f && c !== 0x5c) pointer--;
        } else if (!stateOverride && c === 0x3f) {
          record.query = '';
          state = QUERY;
        } else if (!stateOverride && c === 0x23) {
          record.fragment = '';
          state = FRAGMENT;
        } else if (c !== EOF) {
          state = PATH;
          if (c !== 0x2f) pointer--;
        } else if (stateOverride && record.host === null) {
          pathList(record).push('');
        }
        break;

      case PATH:
        if (c === EOF || c === 0x2f || (special() && c === 0x5c) || (!stateOverride && (c === 0x3f || c === 0x23))) {
          const slash = c === 0x2f || (special() && c === 0x5c);
          const path = pathList(record);
          if (isDoubleDotSegment(buffer)) {
            shortenPath(record);
            if (!slash) path.push('');
          } else if (isSingleDotSegment(buffer)) {
            if (!slash) path.push('');
          } else {
            if (record.scheme === 'file' && path.length === 0 && isWindowsDriveLetter(buffer)) {
              buffer = buffer[0] + ':';
            }
            path.push(buffer);
          }
          buffer = '';
          if (c === 0x3f) {
            record.query = '';
            state = QUERY;
          } else if (c === 0x23) {
            record.fragment = '';
            state = FRAGMENT;
          }
        } else {
          buffer += percentEncodeCodePoint(c, inPathSet);
        }
        break;

      case OPAQUE_PATH:
        if (c === 0x3f) {
          record.query = '';
          state = QUERY;
        } else if (c === 0x23) {
          record.fragment = '';
          state = FRAGMENT;
        } else if (c === 0x20) {
          record.path += next === 0x3f || next === 0x23 ? '%20' : ' ';
        } else if (c !== EOF) {
          record.path += percentEncodeCodePoint(c, inC0ControlSet);
        }
        break;

      case QUERY:
        if ((!stateOverride && c === 0x23) || c === EOF) {
          record.query = (record.query ?? '') + percentEncodeString(buffer, special() ? inSpecialQuerySet : inQuerySet);
          buffer = '';
          if (c === 0x23) {
            record.fragment = '';
            state = FRAGMENT;
          }
        } else {
          buffer += String.fromCodePoint(c);
        }
        break;

      case FRAGMENT:
        if (c !== EOF) record.fragment = (record.fragment ?? '') + percentEncodeCodePoint(c, inFragmentSet);
        break;
    }
  }
  return record;
}

function serializePath(url: URLRecord): string {
  if (typeof url.path === 'string') return url.path;
  let out = '';
  for (const segment of url.path) out += '/' + segment;
  return out;
}

function serializeURL(url: URLRecord): string {
  let out = url.scheme + ':';
  if (url.host !== null) {
    out += '//';
    if (includesCredentials(url)) {
      out += url.username;
      if (url.password !== '') out += ':' + url.password;
      out += '@';
    }
    out += url.host;
    if (url.port !== null) out += ':' + url.port;
  } else if (typeof url.path !== 'string' && url.path.length > 1 && url.path[0] === '') {
    out += '/.';
  }
  out += serializePath(url);
  if (url.query !== null) out += '?' + url.query;
  if (url.fragment !== null) out += '#' + url.fragment;
  return out;
}

function serializeOrigin(url: URLRecord): string {
  switch (url.scheme) {
    case 'blob': {
      const inner = basicURLParse(serializePath(url), null);
      return inner && (inner.scheme === 'http' || inner.scheme === 'https') ? serializeOrigin(inner) : 'null';
    }
    case 'ftp':
    case 'http':
    case 'https':
    case 'ws':
    case 'wss':
      return `${url.scheme}://${url.host}${url.port !== null ? ':' + url.port : ''}`;
    default:
      return 'null';
  }
}

/* -----------------------------
   URLSearchParams Implementation
   ----------------------------- */

// What the owning URL needs to reach inside its URLSearchParams.
interface SearchParamsInternals {
  _list: Array<[string, string]>;
  _url: URLRecord | null;
}

const internals = (params: URLSearchParams) => params as unknown as SearchParamsInternals;

export class URLSearchParams implements Iterable<[string, string]> {
  private _list: Array<[string, string]> = [];
  // The record of the URL whose `searchParams` this is; mutations rewrite its query.
  private _url: URLRecord | null = null;

  constructor(init?: string | Record<string, string> | Array<[string, string]> | URLSearchParams) {
    if (init === undefined) return;
    if (init !== null && (typeof init === 'object' || typeof init === 'function')) {
      const iterable = init as Partial<Iterable<unknown>>;
      if (typeof iterable[Symbol.iterator] === 'function') {
        for (const pair of iterable as Iterable<unknown>) {
          const items = pair !== null && typeof pair === 'object' ? Array.from(pair as Iterable<unknown>) : null;
          if (!items || items.length !== 2) {
            throw new TypeError('Each query pair must be an iterable [name, value] tuple');
          }
          this._list.push([toUSVString(items[0]), toUSVString(items[1])]);
        }
      } else {
        const record = init as Record<string, unknown>;
        for (const key of Object.keys(record)) this._list.push([toUSVString(key), toUSVString(record[key])]);
      }
      return;
    }
    const query = String(init);
    this._list = parseFormUrlencoded(query.startsWith('?') ? query.slice(1) : query);
  }

  private _update() {
    if (!this._url) return;
    const serialized = serializeFormUrlencoded(this._list);
    this._url.query = serialized === '' ? null : serialized;
  }

  append(name: string, value: string) {
    this._list.push([toUSVString(name), toUSVString(value)]);
    this._update();
  }

  set(name: string, value: string) {
    const key = toUSVString(name);
    const val = toUSVString(value);
    const index = this._list.findIndex(([k]) => k === key);
    if (index === -1) {
      this._list.push([key, val]);
    } else {
      this._list[index] = [key, val];
      this._list = this._list.filter(([k], i) => i <= index || k !== key);
    }
    this._update();
  }

  get(name: string): Nullable<string> {
    const key = toUSVString(name);
    const pair = this._list.find(([k]) => k === key);
    return pair ? pair[1] : null;
  }

  getAll(name: string): string[] {
    const key = toUSVString(name);
    return this._list.filter(([k]) => k === key).map(([, v]) => v);
  }

  has(name: string, value?: string): boolean {
    const key = toUSVString(name);
    const val = value === undefined ? undefined : toUSVString(value);
    return this._list.some(([k, v]) => k === key && (val === undefined || v === val));
  }

  delete(name: string, value?: string) {
    const key = toUSVString(name);
    const val = value === undefined ? undefined : toUSVString(value);
    this._list = this._list.filter(([k, v]) => !(k === key && (val === undefined || v === val)));
    this._update();
  }

  forEach(cb: (value: string, name: string, self: URLSearchParams) => void, thisArg?: any) {
    for (let i = 0; i < this._list.length; i++) {
      const [k, v] = this._list[i]!;
      cb.call(thisArg, v, k, this);
    }
  }

  toString(): string {
    return serializeFormUrlencoded(this._list);
  }

  sort() {
    // Stable sort by name, comparing code units.
    this._list = this._list
      .map((pair, index) => ({ pair, index }))
      .sort((a, b) => (a.pair[0] < b.pair[0] ? -1 : a.pair[0] > b.pair[0] ? 1 : a.index - b.index))
      .map(({ pair }) => pair);
    this._update();
  }

  toJSON() {
    return this.toString();
  }

  clone(): URLSearchParams {
    return new URLSearchParams(this);
  }

  // Additional utility methods
  get size(): number {
    return this._list.length;
  }

  clear(): void {
    this._list = [];
    this._update();
  }

  *entries(): IterableIterator<[string, string]> {
    for (let i = 0; i < this._list.length; i++) {
      const [k, v] = this._list[i]!;
      yield [k, v];
    }
  }

  *keys(): IterableIterator<string> {
    for (let i = 0; i < this._list.length; i++) yield this._list[i]![0];
  }

  *values(): IterableIterator<string> {
    for (let i = 0; i < this._list.length; i++) yield this._list[i]![1];
  }

  [Symbol.iterator]() {
    return this.entries();
  }
}

function toUSVString(value: unknown): string {
  const s = String(value);
  return /[\ud800-\udfff]/.test(s) ? fromCodePoints(toCodePoints(s)) : s;
}

/* -----------------------------
   URL Implementation
   ----------------------------- */

export class URL {
  private _r: URLRecord;
  public searchParams: URLSearchParams;

  /** @throws {TypeError} if `input` (resolved against `base`) or `base` is not a valid URL. */
  constructor(input: string, base?: string | URL) {
    let baseRecord: URLRecord | null = null;
    if (base !== undefined) {
      baseRecord = base instanceof URL ? base._r : basicURLParse(String(base), null);
      if (baseRecord === null) throw new TypeError(`Invalid base URL: ${String(base)}`);
    }
    const record = basicURLParse(String(input), baseRecord);
    if (record === null) throw new TypeError(`Invalid URL: ${String(input)}`);
    this._r = record;
    this.searchParams = new URLSearchParams();
    internals(this.searchParams)._url = record;
    this._resetSearchParams();
  }

  // Refill searchParams from the query, keeping the same object (as the standard requires).
  private _resetSearchParams() {
    internals(this.searchParams)._list = this._r.query !== null ? parseFormUrlencoded(this._r.query) : [];
  }

  // Static helper methods
  static canParse(url: string, base?: string | URL): boolean {
    let baseRecord: URLRecord | null = null;
    if (base !== undefined) {
      baseRecord = base instanceof URL ? base._r : basicURLParse(String(base), null);
      if (baseRecord === null) return false;
    }
    return basicURLParse(String(url), baseRecord) !== null;
  }

  static parse(url: string, base?: string | URL): URL | null {
    return URL.canParse(url, base) ? new URL(url, base) : null;
  }

  get href() {
    return serializeURL(this._r);
  }

  set href(val: string) {
    const parsed = basicURLParse(String(val), null);
    if (parsed === null) throw new TypeError(`Invalid URL: ${String(val)}`);
    // Update in place: searchParams holds a reference to this record.
    Object.assign(this._r, parsed);
    this._resetSearchParams();
  }

  get protocol() {
    return this._r.scheme + ':';
  }
  set protocol(val: string) {
    basicURLParse(String(val) + ':', null, this._r, SCHEME_START);
  }

  get username() {
    return this._r.username;
  }
  set username(v: string) {
    if (cannotHaveCredentialsOrPort(this._r)) return;
    this._r.username = percentEncodeString(String(v), inUserinfoSet);
  }

  get password() {
    return this._r.password;
  }
  set password(v: string) {
    if (cannotHaveCredentialsOrPort(this._r)) return;
    this._r.password = percentEncodeString(String(v), inUserinfoSet);
  }

  get host() {
    const { host, port } = this._r;
    if (host === null) return '';
    return port === null ? host : `${host}:${port}`;
  }
  set host(v: string) {
    if (typeof this._r.path === 'string') return;
    basicURLParse(String(v), null, this._r, HOST);
  }

  get hostname() {
    return this._r.host ?? '';
  }
  set hostname(v: string) {
    if (typeof this._r.path === 'string') return;
    basicURLParse(String(v), null, this._r, HOSTNAME);
  }

  get port() {
    return this._r.port === null ? '' : String(this._r.port);
  }
  set port(v: string) {
    if (cannotHaveCredentialsOrPort(this._r)) return;
    const port = String(v);
    if (port === '') this._r.port = null;
    else basicURLParse(port, null, this._r, PORT);
  }

  get pathname() {
    return serializePath(this._r);
  }
  set pathname(v: string) {
    if (typeof this._r.path === 'string') return;
    this._r.path = [];
    basicURLParse(String(v), null, this._r, PATH_START);
  }

  get search() {
    return this._r.query ? '?' + this._r.query : '';
  }
  set search(v: string) {
    const value = String(v);
    if (value === '') {
      this._r.query = null;
      internals(this.searchParams)._list = [];
      return;
    }
    const input = value.startsWith('?') ? value.slice(1) : value;
    this._r.query = '';
    basicURLParse(input, null, this._r, QUERY);
    // Like Node, read the list back from the stored query (tabs and newlines already removed).
    this._resetSearchParams();
  }

  get hash() {
    return this._r.fragment ? '#' + this._r.fragment : '';
  }
  set hash(v: string) {
    const value = String(v);
    if (value === '') {
      this._r.fragment = null;
      return;
    }
    this._r.fragment = '';
    basicURLParse(value.startsWith('#') ? value.slice(1) : value, null, this._r, FRAGMENT);
  }

  get origin() {
    return serializeOrigin(this._r);
  }

  toString() {
    return this.href;
  }

  toJSON() {
    return this.href;
  }
}

// Export for Node.js environments that might not have these globals
export { URL as PolyURL, URLSearchParams as PolyURLSearchParams };
