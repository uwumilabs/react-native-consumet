import type { ISearch } from '../../models';

/** A page with no results: what a provider returns when the site has nothing for the request. */
export function emptySearch<T>(page = 1): ISearch<T> {
  return { currentPage: page, hasNextPage: false, results: [] };
}
