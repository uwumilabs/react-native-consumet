import type { AxiosInstance, AxiosResponse } from 'axios';

/**
 * `fetch` has no timeout option (the `timeout` key is silently ignored), so a stalled
 * request would hang forever. Abort it after `timeoutMs`, including reading the body.
 */
export async function fetchTextWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<{ ok: boolean; status: number; statusText: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = response.ok ? await response.text() : '';
    return { ok: response.ok, status: response.status, statusText: response.statusText, text };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Timed out after ${timeoutMs}ms fetching ${url}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

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

const bodyText = (data: unknown): string =>
  typeof data === 'string' ? data : data == null ? '' : typeof data === 'object' ? JSON.stringify(data) : String(data);

/**
 * The `fetch` extension code runs with, sent through the app's axios (its proxy, headers and
 * interceptors apply). Like `fetch`, it rejects only when no response arrives (network error,
 * timeout); an HTTP error status resolves with `ok: false`.
 */
export function createExtensionFetch(axios: AxiosInstance, timeoutMs = 30000) {
  return async (url: string, options: any = {}): Promise<ExtensionFetchResponse> => {
    let response: AxiosResponse;
    try {
      response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body,
        timeout: timeoutMs,
        // Keep the body as text (axios parses JSON by default) and resolve for every status.
        responseType: 'text',
        validateStatus: () => true,
      });
    } catch (error: any) {
      // An app's axios can still reject an HTTP error (e.g. in an interceptor); it carries the response.
      if (!error?.response) throw new Error(`fetch failed: ${error?.message || error}`);
      response = error.response;
    }

    const { data } = response;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text: async () => bodyText(data),
      json: async () => (typeof data === 'string' ? JSON.parse(data) : data),
    };
  };
}
