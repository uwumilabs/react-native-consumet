"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchTextWithTimeout = fetchTextWithTimeout;
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
//# sourceMappingURL=fetch-with-timeout.js.map