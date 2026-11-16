export const substringAfter = (str: string, toFind: string) => {
  const index = str.indexOf(toFind);
  return index === -1 ? '' : str.substring(index + toFind.length);
};

export const substringBefore = (str: string, toFind: string) => {
  const index = str.indexOf(toFind);
  return index === -1 ? '' : str.substring(0, index);
};

/** Month abbreviations in calendar order, lower case, for parsing dates such as `Apr 5, 2009`. */
export const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// A run of characters that are neither letters nor digits, in any script: ASCII outside [0-9A-Za-z],
// Latin-1 symbols below U+00C0 and the punctuation block U+2000 to U+206F. Ranges, not \p{L}, which
// older Hermes builds lack.
const NOT_LETTERS_OR_DIGITS = /[^0-9A-Za-zÀ-῿⁰-￿]+/g;

/**
 * A title as a search term: every run of characters other than letters and digits becomes a space
 * (`Re:Zero` → `Re Zero`); letters of any script stay (`Pokémon`, `進撃の巨人`).
 */
export const searchTerm = (title: string): string => title.replace(NOT_LETTERS_OR_DIGITS, ' ');

/**
 * A title in the form titles are compared in: lower case, apostrophes dropped, then searchTerm,
 * trimmed. `A Returner's Magic` → `a returners magic`, `Pokémon: XY` → `pokémon xy`.
 */
export const normalizeTitle = (title: string): string => searchTerm(title.toLowerCase().replace(/['`‘’]/g, '')).trim();
