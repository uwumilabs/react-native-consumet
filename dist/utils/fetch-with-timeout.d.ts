import type { AxiosInstance, AxiosResponse } from 'axios';
/**
 * `fetch` has no timeout option (the `timeout` key is silently ignored), so a stalled
 * request would hang forever. Abort it after `timeoutMs`, including reading the body.
 */
export declare function fetchTextWithTimeout(url: string, init?: RequestInit, timeoutMs?: number): Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    text: string;
}>;
/** What the `fetch` extension code runs with resolves to. */
export interface ExtensionFetchResponse {
    /** Whether the status is 2xx; HTTP errors resolve with `ok: false` instead of throwing */
    ok: boolean;
    status: number;
    statusText: string;
    headers: AxiosResponse['headers'];
    /** The body as a string, also for JSON responses */
    text(): Promise<string>;
    json(): Promise<any>;
}
/**
 * The `fetch` extension code runs with, sent through the app's axios (its proxy, headers and
 * interceptors apply). Like `fetch`, it rejects only when no response arrives (network error,
 * timeout); an HTTP error status resolves with `ok: false`.
 */
export declare function createExtensionFetch(axios: AxiosInstance, timeoutMs?: number): (url: string, options?: any) => Promise<ExtensionFetchResponse>;
//# sourceMappingURL=fetch-with-timeout.d.ts.map