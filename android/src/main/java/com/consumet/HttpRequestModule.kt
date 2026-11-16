package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.json.JSONTokener

/** The WebView GET and POST requests, and the direct POST request (OkHttp). */
internal class HttpRequestModule(private val context: Context) {
    private val TAG = "HttpRequestModule"
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        // Time for scripts on the page to settle after it finishes loading (same as iOS).
        private const val CAPTURE_DELAY_MS = 1500L

        // How often a page that isn't ready yet is checked again.
        private const val POLL_MS = 1000L

        // "challenge" on a Cloudflare challenge page ("Just a moment..."), which turns into the real
        // page once its script has run; otherwise "ready" once the document has loaded, else
        // "loading" (same as iOS).
        private val PAGE_STATE_SCRIPT = """
            (function() {
                try {
                    if (window._cf_chl_opt ||
                        document.getElementById('challenge-form') ||
                        document.getElementById('challenge-running') ||
                        document.title === 'Just a moment...') return 'challenge';
                    return document.readyState === 'complete' ? 'ready' : 'loading';
                } catch(e) {
                    return 'ready';
                }
            })();
        """.trimIndent()

        private val HTML_SCRIPT = """
            (function() {
                try {
                    return document.documentElement.outerHTML;
                } catch(e) {
                    return '';
                }
            })();
        """.trimIndent()

        private val POST_RESPONSE_SCRIPT = """
            (function() {
                try {
                    var contentType = 'text/html';
                    var content = document.documentElement.outerHTML;

                    // A JSON response is shown as a lone <pre>
                    if (document.body && document.body.children.length === 1 &&
                        document.body.children[0].tagName === 'PRE') {
                        var text = document.body.children[0].textContent;
                        try {
                            JSON.parse(text);
                            contentType = 'application/json';
                            content = text;
                        } catch(e) {}
                    }

                    return JSON.stringify({
                        content: content,
                        contentType: contentType
                    });
                } catch(e) {
                    return JSON.stringify({
                        content: '',
                        contentType: 'unknown',
                        error: e.message
                    });
                }
            })();
        """.trimIndent()

        /** evaluateJavascript hands back a JSON-encoded value; returns the string it encodes. */
        private fun decodeJsString(value: String?): String? {
            if (value == null || value == "null") return null
            return try {
                JSONTokener(value).nextValue() as? String ?: value
            } catch (e: Exception) {
                value
            }
        }
    }

    /**
     * Loads [url] in a hidden WebView. Resolves `{ url, html, cookies, status: "success" }` once the
     * page has loaded; rejects with WEBVIEW_ERROR when the main document fails to load or TIMEOUT
     * after 30 seconds.
     */
    fun makeGetRequestWithWebView(url: String, headers: ReadableMap?, promise: Promise) {
        Log.d(TAG, "makeGetRequestWithWebView called with url: $url")
        val requestHeaders = RequestHeaders.from(headers)
        handler.post {
            // Without a User-Agent header the WebView keeps its own: Cloudflare fails a challenge
            // whose user agent claims another browser than the WebView's client hints report.
            val task = WebViewTask(context, promise, requestHeaders.userAgent)
            logConsoleMessages(task)
            task.onPageFinished = { view, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                captureUnlessChallenge(task, view) {
                    view.evaluateJavascript(HTML_SCRIPT) { htmlResponse: String? ->
                        val result = WritableNativeMap()
                        result.putString("url", loadedUrl)
                        result.putString("html", decodeJsString(htmlResponse) ?: "")
                        result.putString("cookies", CookieManager.getInstance().getCookie(loadedUrl) ?: "")
                        result.putString("status", "success")
                        task.resolve(result)
                    }
                }
            }
            seedCookies(url, requestHeaders.cookie)
            val extra = requestHeaders.webViewExtra
            task.start { webView ->
                if (extra.isNotEmpty()) {
                    webView.loadUrl(url, extra)
                } else {
                    webView.loadUrl(url)
                }
            }
        }
    }

    /**
     * Posts [body] to [url] in a hidden WebView; the response can be any content type. Android's
     * WebView cannot attach custom headers to a POST: only User-Agent and Cookie are applied, and
     * the body is sent as application/x-www-form-urlencoded. Settles like
     * [makeGetRequestWithWebView].
     */
    fun makePostRequestWithWebView(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequestWithWebView called with url: $url")
        val requestHeaders = RequestHeaders.from(headers)
        handler.post {
            // Without a User-Agent header the WebView keeps its own: Cloudflare fails a challenge
            // whose user agent claims another browser than the WebView's client hints report.
            val task = WebViewTask(context, promise, requestHeaders.userAgent)
            logConsoleMessages(task)
            task.onPageFinished = { view, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                captureUnlessChallenge(task, view) {
                    view.evaluateJavascript(POST_RESPONSE_SCRIPT) { responseJson: String? ->
                        // Like iOS, an unreadable capture gives an empty text/html response.
                        val json = try {
                            JSONObject(decodeJsString(responseJson) ?: "{}")
                        } catch (e: Exception) {
                            JSONObject()
                        }
                        val result = WritableNativeMap()
                        result.putString("url", loadedUrl)
                        result.putString("response", json.optString("content", ""))
                        result.putString("cookies", CookieManager.getInstance().getCookie(loadedUrl) ?: "")
                        result.putString("status", "success")
                        result.putString("contentType", json.optString("contentType", "text/html"))
                        task.resolve(result)
                    }
                }
            }
            seedCookies(url, requestHeaders.cookie)
            Log.d(TAG, "Making POST request to: $url with body length: ${body.length}")
            task.start { webView -> webView.postUrl(url, body.toByteArray(Charsets.UTF_8)) }
        }
    }

    /**
     * Runs [capture] [CAPTURE_DELAY_MS] after the page finished loading, unless the page is a
     * Cloudflare challenge: then the page is checked every [POLL_MS] until the challenge has turned
     * into a loaded page, which is captured [CAPTURE_DELAY_MS] later, or the task times out.
     * Polling the page, not waiting for navigation events, can't miss a reload that finished
     * while a check was running.
     */
    private fun captureUnlessChallenge(task: WebViewTask, view: WebView, capture: () -> Unit) {
        handler.postDelayed({ captureWhenReady(task, view, false, capture) }, CAPTURE_DELAY_MS)
    }

    private fun captureWhenReady(
        task: WebViewTask,
        view: WebView,
        afterChallenge: Boolean,
        capture: () -> Unit,
    ) {
        if (task.isSettled) return
        view.evaluateJavascript(PAGE_STATE_SCRIPT) { result: String? ->
            if (task.isSettled) return@evaluateJavascript
            val state = decodeJsString(result)
            if (state == "challenge" || state == "loading") {
                if (state == "challenge" && !afterChallenge) {
                    Log.d(TAG, "Cloudflare challenge page; waiting for the page it turns into")
                }
                task.keepOpen()
                val sawChallenge = afterChallenge || state == "challenge"
                handler.postDelayed({ captureWhenReady(task, view, sawChallenge, capture) }, POLL_MS)
            } else if (afterChallenge) {
                // The page the challenge turned into gets the same time to settle as a first page.
                handler.postDelayed({ if (!task.isSettled) capture() }, CAPTURE_DELAY_MS)
            } else {
                capture()
            }
        }
    }

    /** Stores the pairs of a Cookie header for [url] before the WebView loads it. */
    private fun seedCookies(url: String, cookieHeader: String?) {
        if (cookieHeader.isNullOrEmpty()) return
        val cookieManager = CookieManager.getInstance()
        for (cookie in cookieHeader.split(";")) {
            cookieManager.setCookie(url, cookie.trim())
        }
    }

    private fun logConsoleMessages(task: WebViewTask) {
        task.webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(TAG, "WebView Console: ${consoleMessage.message()}")
                return true
            }
        }
    }

    /**
     * Posts [body] to [url] with OkHttp, with every header given. The body's media type is the
     * Content-Type header, or JSON without one.
     */
    fun makePostRequest(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequest called with url: $url")
        val requestHeaders = RequestHeaders.from(headers)
        Thread {
            try {
                val mediaType = (requestHeaders.contentType ?: "application/json; charset=utf-8").toMediaType()
                val request = Request.Builder().url(url).post(body.toRequestBody(mediaType))
                for ((key, value) in requestHeaders.all) request.addHeader(key, value)

                val result = HttpClients.post.newCall(request.build()).execute().use { response ->
                    Log.d(TAG, "POST request completed with status: ${response.code}")
                    val responseHeaders = WritableNativeMap()
                    response.headers.names().forEach { name -> responseHeaders.putString(name, response.header(name)) }
                    WritableNativeMap().apply {
                        putInt("statusCode", response.code)
                        putString("body", response.body?.string() ?: "")
                        putMap("headers", responseHeaders)
                    }
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error making POST request: ${e.message}")
                promise.reject("HTTP_ERROR", "Error making POST request: ${e.message}")
            }
        }.start()
    }
}
