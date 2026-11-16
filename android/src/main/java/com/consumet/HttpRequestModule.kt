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
import okhttp3.Headers
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONException
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

        // The page capture scripts. One that throws gives no string, and the request rejects.
        private const val HTML_SCRIPT = "document.documentElement.outerHTML"

        private val POST_RESPONSE_SCRIPT = """
            (function() {
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
            })();
        """.trimIndent()

        private const val CAPTURE_FAILED = "Could not read the loaded page"

        /**
         * evaluateJavascript hands back a JSON-encoded value; returns the string it encodes, or null
         * when the script threw or gave something else.
         */
        private fun decodeJsString(value: String?): String? =
            try {
                JSONTokener(value ?: "null").nextValue() as? String
            } catch (e: JSONException) {
                null
            }

        /**
         * One value per header name, in the case the response first used it. A header the response
         * repeats (Set-Cookie, say) has its values joined with ", ", as NSHTTPURLResponse joins them
         * on iOS.
         */
        internal fun joinedHeaders(headers: Headers): Map<String, String> =
            headers.names().associateWith { headers.values(it).joinToString(", ") }
    }

    /**
     * Loads [url] in a hidden WebView. Resolves `{ url, html, cookies, status: "success" }` once the
     * page has loaded, with the URL of the page that finished last and its cookies. Rejects with
     * WEBVIEW_ERROR when the main document fails to load, the page can't be read or the renderer
     * dies, and with TIMEOUT when it hasn't settled 30 seconds after the call.
     */
    fun makeGetRequestWithWebView(url: String, headers: ReadableMap?, promise: Promise) {
        Log.d(TAG, "makeGetRequestWithWebView called with url: $url")
        val requestHeaders = RequestHeaders.from(headers)
        handler.post {
            // Without a User-Agent header the WebView keeps its own: Cloudflare fails a challenge
            // whose user agent claims another browser than the WebView's client hints report.
            val task = WebViewTask(context, promise, requestHeaders.userAgent)
            logConsoleMessages(task)
            task.onPageFinished = { view ->
                captureUnlessChallenge(task, view) {
                    readPage(task, view, HTML_SCRIPT) { html ->
                        val finalUrl = task.finishedUrl ?: url
                        val result = WritableNativeMap()
                        result.putString("url", finalUrl)
                        result.putString("html", html)
                        result.putString("cookies", CookieManager.getInstance().getCookie(finalUrl) ?: "")
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
            task.onPageFinished = { view ->
                captureUnlessChallenge(task, view) {
                    readPage(task, view, POST_RESPONSE_SCRIPT) { json ->
                        // A page can replace JSON.stringify, so the capture is checked too.
                        val page = try {
                            JSONObject(json).let { it.getString("content") to it.getString("contentType") }
                        } catch (e: JSONException) {
                            null
                        }
                        if (page == null) return@readPage captureFailed(task)
                        val finalUrl = task.finishedUrl ?: url
                        val result = WritableNativeMap()
                        result.putString("url", finalUrl)
                        result.putString("response", page.first)
                        result.putString("cookies", CookieManager.getInstance().getCookie(finalUrl) ?: "")
                        result.putString("status", "success")
                        result.putString("contentType", page.second)
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
     * Runs [script] on the page and passes on the string it returns. A script that throws or gives
     * no string (the page has no document, say) rejects the task with WEBVIEW_ERROR.
     */
    private fun readPage(task: WebViewTask, view: WebView, script: String, use: (String) -> Unit) {
        view.evaluateJavascript(script) { result: String? ->
            if (task.isSettled) return@evaluateJavascript
            val value = decodeJsString(result)
            if (value == null) captureFailed(task) else use(value)
        }
    }

    private fun captureFailed(task: WebViewTask) {
        Log.e(TAG, CAPTURE_FAILED)
        task.reject(WebViewTask.WEBVIEW_ERROR, CAPTURE_FAILED)
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
                    for ((name, value) in joinedHeaders(response.headers)) responseHeaders.putString(name, value)
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
