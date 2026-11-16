"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.emptySearch = emptySearch;
/** A page with no results: what a provider returns when the site has nothing for the request. */
function emptySearch() {
  let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  return {
    currentPage: page,
    hasNextPage: false,
    results: []
  };
}
//# sourceMappingURL=search.js.map