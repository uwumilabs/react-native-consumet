import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Native side of the library: Android (WebView, OkHttp, QuickJS) and iOS (WKWebView, URLSession,
 * JavaScriptCore). Both platforms follow the contract documented here, and
 * test/unit/native-contract.test.ts pins it.
 *
 * Rejections are Errors with a `code`, the same on both platforms:
 *
 * | code              | methods                        | meaning                                                         |
 * | ----------------- | ------------------------------ | --------------------------------------------------------------- |
 * | `WEBVIEW_ERROR`   | WebView requests (below)       | The main document failed to load (DNS, TLS, connection).        |
 * | `TIMEOUT`         | WebView requests (below)       | The main document did not finish loading within 30 s.           |
 * | `COOKIE_ERROR`    | getDdosGuardCookiesWithWebView | The page loaded but set no `__ddg2_` cookie.                    |
 * | `ERROR`           | bypassDdosGuard                | Invalid URL, or no DDoS-Guard cookie could be obtained.         |
 * | `HTTP_ERROR`      | makePostRequest                | Invalid URL or transport failure. HTTP error statuses resolve.  |
 * | `NetworkError`    | deobfuscateScript              | Synchrony could not be downloaded or failed its SHA-256 check.  |
 * | `ParseError`      | deobfuscateScript              | The Synchrony script did not have the expected format.          |
 * | `EvaluationError` | deobfuscateScript              | Synchrony threw (e.g. on invalid JavaScript) or gave no string. |
 *
 * WebView requests (getDdosGuardCookiesWithWebView, makeGetRequestWithWebView,
 * makePostRequestWithWebView) load the URL in a hidden WebView:
 * - Only the main document decides the outcome. Failed sub-resources (images, scripts, iframes)
 *   are ignored, and HTTP error statuses (403, 503, ...) still resolve with the page.
 * - The first finished page settles the request; later navigations and errors are ignored.
 * - `cookies` (and the getDdosGuardCookiesWithWebView result) is a Cookie header string with the
 *   cookies that apply to the loaded URL.
 * - Cookies carry over between calls. Android uses the app-wide CookieManager; iOS uses an
 *   in-memory store shared by this module's WebViews only, cleared when the app restarts.
 *
 * Extension code from the registry can run against older native builds (1.6.0 and earlier). Those
 * differ: Android resolved `{ cookie }` from getDdosGuardCookiesWithWebView and resolved
 * WebView-request timeouts with `status: 'timeout'` (no `html`/`response`); iOS resolved `null`
 * when deobfuscateScript failed. Code that must also run there should accept those shapes.
 */
export interface Spec extends TurboModule {
  /**
   * Gets a DDoS-Guard cookie over plain HTTP (no WebView). Resolves `{ cookie }`: a Cookie header
   * with the cookies already stored for `url` plus the new DDoS-Guard cookie. Rejects with `ERROR`.
   */
  bypassDdosGuard(url: string): Promise<{ cookie: string }>;
  /**
   * Loads `url` in a hidden WebView and resolves with the Cookie header string for the loaded URL
   * once it holds a `__ddg2_` cookie. Rejects with `COOKIE_ERROR`, `WEBVIEW_ERROR` or `TIMEOUT`.
   */
  getDdosGuardCookiesWithWebView(url: string): Promise<string>;
  /**
   * Loads `url` in a hidden WebView and resolves 1.5 s after the main document finishes loading,
   * with its `outerHTML`, the final URL and its cookies. User-Agent and Cookie headers are applied
   * to the WebView; other headers are sent with the request. `status` is always `'success'`:
   * failures and timeouts reject (`WEBVIEW_ERROR`, `TIMEOUT`).
   */
  makeGetRequestWithWebView(
    url: string,
    headers: { [key: string]: string }
  ): Promise<{
    url: string;
    html: string;
    cookies: string;
    status: string;
  }>;
  /**
   * Like makeGetRequestWithWebView, but POSTs `body`. `response` is the JSON text when the page is
   * a single `<pre>` holding valid JSON (`contentType: 'application/json'`), otherwise the page
   * HTML (`'text/html'`). Android's WebView cannot attach custom headers to a POST: only
   * User-Agent and Cookie apply, and the body is sent as `application/x-www-form-urlencoded`.
   */
  makePostRequestWithWebView(
    url: string,
    headers: { [key: string]: string },
    body: string
  ): Promise<{
    url: string;
    response: string;
    cookies: string;
    status: string;
    contentType: string;
  }>;
  /**
   * Plain HTTP POST (OkHttp / URLSession, no WebView). Resolves for every HTTP status;
   * `Content-Type` defaults to `application/json; charset=utf-8`. Rejects with `HTTP_ERROR`.
   */
  makePostRequest(
    url: string,
    headers: { [key: string]: string },
    body: string
  ): Promise<{
    statusCode: number;
    body: string;
    headers: { [key: string]: string };
  }>;
  /**
   * Runs Synchrony (a javascript-obfuscator deobfuscator) on `source` in a separate JS engine and
   * resolves with the deobfuscated code. Rejects with `NetworkError`, `ParseError` or
   * `EvaluationError`; current builds never resolve `null`, but older iOS builds did (see above),
   * so keep a null check in extension code.
   *
   * The Synchrony script (a pinned version) is downloaded at most once per app process and kept in
   * memory, and a copy goes to the app's cache directory, so later launches need no download. A
   * download or cached copy without the pinned SHA-256 is never run: the download rejects with
   * `NetworkError`, and a bad cached copy is deleted and downloaded again.
   */
  deobfuscateScript: (source: string) => Promise<string | null>;
}

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const makePostRequestWithWebView = NativeConsumet.makePostRequestWithWebView;
export const makePostRequest = NativeConsumet.makePostRequest;
export const deobfuscateScript = NativeConsumet.deobfuscateScript;

export default NativeConsumet;
