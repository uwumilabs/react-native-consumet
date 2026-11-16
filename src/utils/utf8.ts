/** Code points and UTF-8, written out so nothing depends on the runtime providing TextEncoder. */

// The code points of a string, with lone surrogates replaced by U+FFFD (USVString conversion).
export function toCodePoints(input: string): number[] {
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

export function fromCodePoints(codePoints: number[]): string {
  let out = '';
  for (const cp of codePoints) out += String.fromCodePoint(cp);
  return out;
}

export function utf8EncodeCodePoint(cp: number, bytes: number[]) {
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

/** UTF-8 bytes of `input`: a lone surrogate becomes U+FFFD, as with TextEncoder and Node. */
export function utf8Encode(input: string): number[] {
  const bytes: number[] = [];
  for (const cp of toCodePoints(input)) utf8EncodeCodePoint(cp, bytes);
  return bytes;
}
