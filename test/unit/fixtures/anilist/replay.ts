/**
 * A real AniList GraphQL response, trimmed (long lists cut, descriptions shortened), with the
 * variables it was requested with.
 */
export type AniListFixture = {
  request: string;
  recordedAt: string;
  note: string;
  variables: Record<string, unknown>;
  status: number;
  body: any;
};

type RequestBody = { query: string; variables?: Record<string, unknown> };
type PostSpy = { mockResolvedValueOnce(value: any): unknown; mock: { calls: unknown[][] } };

/** What `metaHttp.post` resolves with for a recorded response. */
export const response = (fixture: { status: number; body: unknown }) => ({ status: fixture.status, data: fixture.body });

/** Makes a `metaHttp.post` spy answer with recorded responses, one per request, in order. */
export const replay = <T extends PostSpy>(post: T, ...fixtures: { status: number; body: unknown }[]): T => {
  for (const fixture of fixtures) post.mockResolvedValueOnce(response(fixture));
  return post;
};

/** The body of each request sent to AniList. */
export const sentBodies = (post: PostSpy) => post.mock.calls.map(([, body]) => body as RequestBody);

/** A deep, loosely typed copy, so a test can edit a fixture without affecting the others. */
export const copy = (value: unknown): any => JSON.parse(JSON.stringify(value));
