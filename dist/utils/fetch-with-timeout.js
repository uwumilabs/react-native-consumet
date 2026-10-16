"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchTextWithTimeout = fetchTextWithTimeout;
exports.createExtensionFetch = createExtensionFetch;
/**
 * `fetch` has no timeout option (the `timeout` key is silently ignored), so a stalled
 * request would hang forever. Abort it after `timeoutMs`, including reading the body.
 */
async function fetchTextWithTimeout(url) {
  let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let timeoutMs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    const text = response.ok ? await response.text() : '';
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Timed out after ${timeoutMs}ms fetching ${url}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
const bodyText = data => typeof data === 'string' ? data : data == null ? '' : typeof data === 'object' ? JSON.stringify(data) : String(data);
/**
 * The `fetch` extension code runs with, sent through the app's axios (its proxy, headers and
 * interceptors apply). Like `fetch`, it rejects only when no response arrives (network error,
 * timeout); an HTTP error status resolves with `ok: false`.
 */
function createExtensionFetch(axios) {
  let timeoutMs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 30000;
  return async function (url) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let response;
    try {
      response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body,
        timeout: timeoutMs,
        // Keep the body as text (axios parses JSON by default) and resolve for every status.
        responseType: 'text',
        validateStatus: () => true
      });
    } catch (error) {
      // An app's axios can still reject an HTTP error (e.g. in an interceptor); it carries the response.
      if (!error?.response) throw new Error(`fetch failed: ${error?.message || error}`);
      response = error.response;
    }
    const {
      data
    } = response;
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text: async () => bodyText(data),
      json: async () => typeof data === 'string' ? JSON.parse(data) : data
    };
  };
}
//# sourceMappingURL=fetch-with-timeout.js.map