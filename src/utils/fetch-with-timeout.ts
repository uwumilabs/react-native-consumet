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
