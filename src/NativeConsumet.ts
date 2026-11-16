import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Native side of the library: Android (WebView, OkHttp, QuickJS) and iOS (WKWebView, URLSession,
 * JavaScriptCore). Both platforms follow the contract documented here, and
 * test/unit/native-contract.test.ts pins it.
 *
 * Rejections are Errors with a `code`, the same on both platforms:
 *
 * | code              | methods                  | meaning                                                                    |
 * | ----------------- | ------------------------ | -------------------------------------------------------------------------- |
 * | `WEBVIEW_ERROR`   | WebView requests (below) | The main document failed to load, the page couldn't be read, or it died.   |
 * | `TIMEOUT`         | WebView requests (below) | No page (past any Cloudflare challenge) was loaded and read within 30 s.   |
 * | `HTTP_ERROR`      | makePostRequest          | Invalid URL or transport failure. HTTP error statuses resolve.             |
 * | `NetworkError`    | deobfuscateScript        | Synchrony could not be downloaded or failed its SHA-256 check.             |
 * | `ParseError`      | deobfuscateScript        | The Synchrony script did not have the expected format.                     |
 * | `EvaluationError` | deobfuscateScript        | Synchrony threw (e.g. on invalid JavaScript) or gave no string.            |
 *
 * WebView requests (makeGetRequestWithWebView, makePostRequestWithWebView) load the URL in a hidden
 * WebView:
 * - Only the main document decides the outcome. Failed sub-resources (images, scripts, iframes)
 *   are ignored, and HTTP error statuses (403, 503, ...) still resolve with the page.
 * - The first page that finishes loading settles the request; later navigations and load errors
 *   are ignored. The exception is a Cloudflare challenge page ("Just a moment..."): the request
 *   waits for the page the challenge reloads into once its script has run, within the same 30 s.
 * - The 30 s run from the call until the request settles, whatever it is waiting for: a page that
 *   is still loading, or still being read, when they pass rejects with `TIMEOUT`.
 * - `url` is the URL of the page that finished loading last (after a challenge, the page it
 *   reloaded into), and `cookies` is a Cookie header string with the cookies that apply to it.
 * - A page that can't be read once it has loaded rejects with `WEBVIEW_ERROR`; it never resolves
 *   an empty `html` or `response`. So does a WebView whose renderer (iOS: web content) process
 *   dies, crashed or killed to free memory, even after the page finished loading; the app keeps
 *   running.
 * - Cookies carry over between calls. Android uses the app-wide CookieManager; iOS uses an
 *   in-memory store shared by this module's WebViews only, cleared when the app restarts.
 */
export interface Spec extends TurboModule {
  /**
   * Loads `url` in a hidden WebView and resolves 1.5 s after the main document finishes loading
   * (the page a Cloudflare challenge reloads into, when the first page is one), with its
   * `outerHTML`, the final URL and its cookies. User-Agent and Cookie headers are applied
   * to the WebView; other headers are sent with the request. Without a User-Agent header the
   * WebView keeps the engine's own (on iOS with Mobile Safari's tokens), which Cloudflare checks
   * against what the engine reports. `status` is always `'success'`:
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
   * `Content-Type` (matched in any case) defaults to `application/json; charset=utf-8`. Rejects
   * with `HTTP_ERROR`. `headers` has one entry per response header name; a header the response
   * repeats (`Set-Cookie`, say) has its values joined with `', '`.
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
   * Runs Synchrony (a javascript-obfuscator deobfuscator) on `source` in a separate JS engine, on a
   * thread with an 8 MB stack, and resolves with the deobfuscated code. Rejects with
   * `NetworkError`, `ParseError` or `EvaluationError`.
   *
   * The Synchrony script (a pinned version) is downloaded at most once per app process and kept in
   * memory, and a copy goes to the app's cache directory, so later launches need no download. A
   * download or cached copy without the pinned SHA-256 is never run: the download rejects with
   * `NetworkError`, and a bad cached copy is deleted and downloaded again.
   */
  deobfuscateScript(source: string): Promise<string>;
}

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

/** The native methods, as contexts hand them to providers and extractors. */
export type NativeMethods = Omit<Spec, keyof TurboModule>;

/** The spec's methods in a plain object (extension code destructures and spreads it). */
export const nativeMethods: NativeMethods = {
  makeGetRequestWithWebView: NativeConsumet.makeGetRequestWithWebView,
  makePostRequestWithWebView: NativeConsumet.makePostRequestWithWebView,
  makePostRequest: NativeConsumet.makePostRequest,
  deobfuscateScript: NativeConsumet.deobfuscateScript,
};

export default NativeConsumet;
