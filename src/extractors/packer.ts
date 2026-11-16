// One eval(function(p,a,c,k,e,d){...}('payload',radix,count,'words'.split('|'))) block. The payload
// and the words are single-quoted string literals, matched escapes included.
const PACKED =
  /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'((?:[^'\\]|\\[\s\S])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\[\s\S])*)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;

/** The value of a string literal's source: its backslash escapes undone (`\'` → `'`, `\n` → newline). */
const unescapeJs = (text: string) =>
  text.replace(/\\(.)/g, (_, char: string) => (char === 'n' ? '\n' : char === 'r' ? '\r' : char === 't' ? '\t' : char));

/**
 * The code a packed block evaluates to, without evaluating any: each word of the payload is looked
 * up once in the word list, as the packer's own decoder does in today's engines, so a word that
 * came from the list is never replaced again.
 */
function unpack(block: RegExpExecArray): string {
  const radix = parseInt(block[2]!, 10);
  const count = parseInt(block[3]!, 10);
  const words = unescapeJs(block[4]!).split(block[5]!);

  const encode = (n: number): string => {
    const rest = n % radix;
    return (
      (n < radix ? '' : encode(Math.floor(n / radix))) +
      (rest > 35 ? String.fromCharCode(rest + 29) : rest.toString(36))
    );
  };
  const dictionary = new Map<string, string>();
  for (let i = 0; i < count; i++) dictionary.set(encode(i), words[i] || encode(i));

  return unescapeJs(block[1]!).replace(/\b\w+\b/g, (word) => dictionary.get(word) ?? word);
}

/** The code of every script in `text` packed with Dean Edwards' packer (`eval(function(p,a,c,k,e,d)…)`), in order. */
export function unpackScripts(text: string): string[] {
  const blocks = new RegExp(PACKED.source, 'g');
  const scripts: string[] = [];
  let block: RegExpExecArray | null;
  while ((block = blocks.exec(text))) scripts.push(unpack(block));
  return scripts;
}
