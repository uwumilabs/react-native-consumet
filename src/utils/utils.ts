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
