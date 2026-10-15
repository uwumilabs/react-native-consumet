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
//# sourceMappingURL=fetch-with-timeout.d.ts.map