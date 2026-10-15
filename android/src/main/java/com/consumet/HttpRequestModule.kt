package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONObject
import org.json.JSONTokener
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType

/**
 * Headers passed to a WebView request, split the way both platforms apply them: User-Agent goes
 * to the WebView settings, Cookie values go into the cookie store before loading (a WebView
 * ignores a raw Cookie header), everything else is sent with the request. Names match
 * case-insensitively, as on iOS.
 */
internal data class WebViewHeaders(
    val userAgent: String?,
    val cookie: String?,
    val extra: Map<String, String>,
) {
    companion object {
        fun split(headers: Map<String, String>): WebViewHeaders {
            var userAgent: String? = null
            var cookie: String? = null
            val extra = LinkedHashMap<String, String>()
            for ((key, value) in headers) {
                when {
                    key.equals("User-Agent", ignoreCase = true) -> userAgent = value
                    key.equals("Cookie", ignoreCase = true) -> cookie = value
                    else -> extra[key] = value
                }
            }
            return WebViewHeaders(userAgent, cookie, extra)
        }

        fun from(headers: ReadableMap?): WebViewHeaders {
            val map = LinkedHashMap<String, String>()
            headers?.let {
                val iterator = it.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    map[key] = it.getString(key) ?: ""
                }
            }
            return split(map)
        }
    }
}

/**
 * Helper class for making HTTP requests using WebView.
 * This provides a way to make requests with full browser-like behavior,
 * including JavaScript execution and cookie management.
 */
class HttpRequestModule(private val context: Context) {
    private val TAG = "HttpRequestModule"
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val DEFAULT_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

        // Time for scripts on the page to settle after it finishes loading (same as iOS).
        private const val CAPTURE_DELAY_MS = 1500L

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
                    // Try to detect content type from response
                    var contentType = 'text/html';
                    var content = document.documentElement.outerHTML;

                    // Check if it's JSON
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
     * Makes a GET request using WebView with the ability to set custom headers.
     * This is useful when you need to execute JavaScript or handle complex cookie scenarios.
     * Resolves `{ url, html, cookies, status: "success" }` once the page has loaded; rejects with
     * WEBVIEW_ERROR when the main document fails to load or TIMEOUT after 30 seconds.
     *
     * @param url The URL to request
     * @param headers Optional headers to include in the request (ReadableMap)
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makeGetRequestWithWebView(url: String, headers: ReadableMap?, promise: Promise) {
        Log.d(TAG, "makeGetRequestWithWebView called with url: $url")
        val requestHeaders = WebViewHeaders.from(headers)
        handler.post {
            val task = WebViewTask(context, promise, requestHeaders.userAgent ?: DEFAULT_USER_AGENT)
            logConsoleMessages(task)
            task.onPageFinished = { view, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                handler.postDelayed({
                    if (!task.isSettled) {
                        view.evaluateJavascript(HTML_SCRIPT) { htmlResponse: String? ->
                            val result = WritableNativeMap()
                            result.putString("url", loadedUrl)
                            result.putString("html", decodeJsString(htmlResponse) ?: "")
                            result.putString("cookies", CookieManager.getInstance().getCookie(loadedUrl) ?: "")
                            result.putString("status", "success")
                            task.resolve(result)
                        }
                    }
                }, CAPTURE_DELAY_MS)
            }
            seedCookies(url, requestHeaders.cookie)
            task.start { webView ->
                if (requestHeaders.extra.isNotEmpty()) {
                    webView.loadUrl(url, requestHeaders.extra)
                } else {
                    webView.loadUrl(url)
                }
            }
        }
    }

    /**
     * Makes a POST request using WebView with the ability to set custom headers and body.
     * The response can be any content type (HTML, JSON, XML, etc.).
     * Android's WebView cannot attach custom headers to a POST: only User-Agent and Cookie are
     * applied, and the body is sent as application/x-www-form-urlencoded. Settles like
     * [makeGetRequestWithWebView].
     *
     * @param url The URL to request
     * @param headers Optional headers to include in the request (ReadableMap)
     * @param body The POST body content
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makePostRequestWithWebView(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequestWithWebView called with url: $url")
        val requestHeaders = WebViewHeaders.from(headers)
        handler.post {
            val task = WebViewTask(context, promise, requestHeaders.userAgent ?: DEFAULT_USER_AGENT)
            logConsoleMessages(task)
            task.onPageFinished = { view, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                handler.postDelayed({
                    if (!task.isSettled) {
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
                }, CAPTURE_DELAY_MS)
            }
            seedCookies(url, requestHeaders.cookie)
            Log.d(TAG, "Making POST request to: $url with body length: ${body.length}")
            task.start { webView -> webView.postUrl(url, body.toByteArray(Charsets.UTF_8)) }
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

    // Log console messages for debugging
    private fun logConsoleMessages(task: WebViewTask) {
        task.webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(TAG, "WebView Console: ${consoleMessage.message()}")
                return true
            }
        }
    }

    /**
     * Makes a POST request using OkHttp client (not WebView).
     * This is faster and more efficient for API calls.
     *
     * @param url The URL to request
     * @param headers Headers to include in the request (ReadableMap)
     * @param body The POST body content
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makePostRequest(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequest called with url: $url")
        
        Thread {
            try {
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                
                // Build request body
                val mediaType = headers?.getString("Content-Type")?.let { 
                    it.toMediaType()
                } ?: "application/json; charset=utf-8".toMediaType()
                
                val requestBody = body.toRequestBody(mediaType)
                
                // Build headers
                val requestBuilder = okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                
                headers?.let { headersMap ->
                    val iterator = headersMap.keySetIterator()
                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        val value = headersMap.getString(key) ?: ""
                        requestBuilder.addHeader(key, value)
                    }
                }
                
                val request = requestBuilder.build()
                
                // Execute request
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                
                // Build response headers map
                val responseHeaders = WritableNativeMap()
                response.headers.names().forEach { name ->
                    responseHeaders.putString(name, response.header(name))
                }
                
                // Build result
                val result = WritableNativeMap()
                result.putInt("statusCode", response.code)
                result.putString("body", responseBody)
                result.putMap("headers", responseHeaders)
                
                Log.d(TAG, "POST request completed with status: ${response.code}")
                promise.resolve(result)
                
                response.close()
            } catch (e: Exception) {
                Log.e(TAG, "Error making POST request: ${e.message}")
                promise.reject("HTTP_ERROR", "Error making POST request: ${e.message}")
            }
        }.start()
    }
}
