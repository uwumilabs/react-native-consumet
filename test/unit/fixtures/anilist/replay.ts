/**
 * Replays recorded AniList GraphQL responses (trimmed real ones: long lists cut, descriptions
 * shortened; each fixture notes its request and variables) the way AniList answers a query: with
 * only the fields the query selects, and with `status` read as AniList's version 1 does unless the
 * query asks for `status(version: 2)` (version 1 reports a media on hiatus as RELEASING). So a query
 * that stops asking for a field shows up as that field missing from what the library returns.
 */

type Recording = { status: number; body: any };
type RequestBody = { query: string; variables?: Record<string, unknown> };
type PostSpy = {
  mockImplementation(fn: (...args: any[]) => any): unknown;
  mockImplementationOnce(fn: (...args: any[]) => any): unknown;
  mock: { calls: unknown[][] };
};

/** The fields a selection set asks for: field name → its arguments (as written) and sub-selection. */
type Selection = Map<string, { args: string; fields: Selection }>;

/** Reads the selection set of a query. The library's queries use no aliases or fragments. */
function selectionOf(query: string): Selection {
  // The operation's selection set; the variable list before it has no braces.
  let i = query.indexOf('{');
  const skipSpace = () => {
    while (i < query.length && /[\s,]/.test(query[i]!)) i++;
  };
  const selectionSet = (): Selection => {
    const fields: Selection = new Map();
    i++;
    for (skipSpace(); i < query.length && query[i] !== '}'; skipSpace()) {
      const name = /^[_A-Za-z]\w*/.exec(query.slice(i))?.[0];
      if (!name) throw new Error(`Unexpected query text: ${query.slice(i, i + 30)}`);
      i += name.length;
      skipSpace();
      let args = '';
      if (query[i] === '(') {
        const end = query.indexOf(')', i);
        args = query.slice(i + 1, end);
        i = end + 1;
        skipSpace();
      }
      fields.set(name, { args, fields: query[i] === '{' ? selectionSet() : new Map() });
    }
    i++;
    return fields;
  };
  return selectionSet();
}

/** `value` with only the selected fields. */
function select(value: any, fields: Selection): any {
  if (Array.isArray(value)) return value.map((item) => select(item, fields));
  if (value === null || typeof value !== 'object' || fields.size === 0) return value;
  const selected: Record<string, unknown> = {};
  for (const [name, { args, fields: subFields }] of fields) {
    if (!(name in value)) continue;
    const field = select(value[name], subFields);
    selected[name] = name === 'status' && field === 'HIATUS' && !/\bversion:\s*2\b/.test(args) ? 'RELEASING' : field;
  }
  return selected;
}

/** What `metaHttp.post` resolves with when AniList answers `request` from `recording`. */
export const answer = (recording: Recording, request: RequestBody) => ({
  status: recording.status,
  data: { ...recording.body, data: select(recording.body.data, selectionOf(request.query)) },
});

/** Makes a `metaHttp.post` spy answer from recorded responses, one per request, in order. */
export const replay = <T extends PostSpy>(post: T, ...recordings: Recording[]): T => {
  for (const recording of recordings) post.mockImplementationOnce(async (_url: string, body: RequestBody) => answer(recording, body));
  return post;
};

/** Makes a `metaHttp.post` spy answer every request from `recording`. */
export const replayAlways = <T extends PostSpy>(post: T, recording: Recording): T => {
  post.mockImplementation(async (_url: string, body: RequestBody) => answer(recording, body));
  return post;
};

/** The body of each request sent to AniList. */
export const sentBodies = (post: Pick<PostSpy, 'mock'>) => post.mock.calls.map(([, body]) => body as RequestBody);

/** A deep, loosely typed copy, so a test can edit a fixture without affecting the others. */
export const copy = (value: unknown): any => JSON.parse(JSON.stringify(value));
