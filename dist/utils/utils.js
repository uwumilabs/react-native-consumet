"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTHS = exports.substringBefore = exports.substringAfter = void 0;
const substringAfter = (str, toFind) => {
    const index = str.indexOf(toFind);
    return index === -1 ? '' : str.substring(index + toFind.length);
};
exports.substringAfter = substringAfter;
const substringBefore = (str, toFind) => {
    const index = str.indexOf(toFind);
    return index === -1 ? '' : str.substring(0, index);
};
exports.substringBefore = substringBefore;
/** Month abbreviations in calendar order, lower case, for parsing dates such as `Apr 5, 2009`. */
exports.MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
//# sourceMappingURL=utils.js.map