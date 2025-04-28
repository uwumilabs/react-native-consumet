package com.consumet

import android.os.Handler
import android.os.Looper
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import java.net.HttpCookie
import java.util.regex.Pattern
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class DdosGuardHelper(private val reactContext: ReactApplicationContext) {
    private val client = OkHttpClient.Builder().build()
    private val cookieManager = CookieManager.getInstance()

    fun bypassDdosGuard(url: String, promise: Promise) {
        try {
            val httpUrl =
                    url.toHttpUrlOrNull()
                            ?: run {
                                promise.reject("ERROR", "Invalid URL")
                                return
                            }

            val cookies = cookieManager.getCookie(url)
            val oldCookies = mutableListOf<Cookie>()
            var ddg2Cookie: Cookie? = null

            if (!cookies.isNullOrEmpty()) {
                cookies.split(";").forEach { cookieStr ->
                    Cookie.parse(httpUrl, cookieStr.trim())?.let { cookie ->
                        oldCookies.add(cookie)
                        if (cookie.name == "__ddg2") {
                            ddg2Cookie = cookie
                        }
                    }
                }
            }

            if (ddg2Cookie != null && !ddg2Cookie!!.value.isEmpty()) {
                val result = WritableNativeMap()
                result.putString("cookie", cookiesToHeaderString(oldCookies))
                promise.resolve(result)
                return
            }

            // Get new cookie
            val newCookie =
                    getNewCookie(httpUrl)
                            ?: run {
                                promise.reject("ERROR", "Failed to get DDos-Guard cookie")
                                return
                            }

            oldCookies.add(newCookie)
            val newCookieHeader = cookiesToHeaderString(oldCookies)

            val result = WritableNativeMap()
            result.putString("cookie", newCookieHeader)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    private fun getNewCookie(url: okhttp3.HttpUrl): Cookie? {
        val cookies = cookieManager.getCookie(url.toString())
        val oldCookies = mutableListOf<Cookie>()
        var ddg2Cookie: Cookie? = null

        if (!cookies.isNullOrEmpty()) {
            cookies.split(";").forEach { cookieStr ->
                Cookie.parse(url, cookieStr.trim())?.let { cookie ->
                    oldCookies.add(cookie)
                    if (cookie.name == "__ddg2") {
                        ddg2Cookie = cookie
                    }
                }
            }
        }

        if (ddg2Cookie != null && !ddg2Cookie!!.value.isEmpty()) {
            return ddg2Cookie
        }

        val checkJsRequest =
                Request.Builder().url("https://check.ddos-guard.net/check.js").get().build()

        val checkJsResponse = client.newCall(checkJsRequest).execute()
        val checkJsBody = checkJsResponse.body?.string() ?: ""
        checkJsResponse.close()

        // Extract well-known path from check.js
        val pattern = Pattern.compile("'([^']*)'")
        val matcher = pattern.matcher(checkJsBody)
        if (!matcher.find()) {
            return null
        }
        val wellKnown = matcher.group(1)

        val checkUrl = "${url.scheme}://${url.host}$wellKnown"
        val checkRequest = Request.Builder().url(checkUrl).get().build()

        val checkResponse = client.newCall(checkRequest).execute()
        val setCookieHeader = checkResponse.header("set-cookie")
        checkResponse.close()

        return setCookieHeader?.let { Cookie.parse(url, it) }
    }

    private fun cookiesToHeaderString(cookies: List<Cookie>): String {
        return cookies.joinToString("; ") { "${it.name}=${it.value}" }
    }

    fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(reactContext)
            webView.settings.javaScriptEnabled = true
            webView.settings.domStorageEnabled = true

            webView.webViewClient =
                    object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String) {
                            val cookieManager = android.webkit.CookieManager.getInstance()
                            val cookie = cookieManager.getCookie(url)
                            if (!cookie.isNullOrEmpty() && cookie.contains("__ddg2")) {
                                promise.resolve(cookie)
                            } else {
                                promise.reject("COOKIE_ERROR", "No __ddg2 cookie received")
                            }
                        }
                    }

            webView.loadUrl(url)
        }
    }

    fun makePostRequestWithOkHttp(
            url: String,
            postBody: String,
            mimeType: String = "application/x-www-form-urlencoded",
            promise: Promise
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val cookiesMap = getCookiesByGetThenPost(url, postBody, mimeType)

                val cookieString = cookiesMap.entries.joinToString("; ") { "${it.key}=${it.value}" }

                val result = WritableNativeMap()
                result.putString("cookies", cookieString)
                result.putString("url", url)
                result.putString("response", "") // No response body returned in this implementation
                result.putString("status", "success")

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("HTTP_ERROR", "Failed to make POST request: ${e.message}", e)
            }
        }
    }

    // Add this new method to your class
    private suspend fun getCookiesByGetThenPost(
            url: String,
            postBody: String,
            mimeType: String = "application/x-www-form-urlencoded",
            userAgent: String =
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ): Map<String, String> =
            withContext(Dispatchers.IO) {
                val allCookies = mutableMapOf<String, String>()

                // Step 1: Initial GET
                val getRequest =
                        Request.Builder().url(url).get().header("User-Agent", userAgent).build()

                client.newCall(getRequest).execute().use { response ->
                    val setCookies = response.headers("Set-Cookie")
                    setCookies.forEach { rawCookie -> parseAndAddCookies(rawCookie, allCookies) }
                }

                // Step 2: POST request with previous cookies
                val requestBody = postBody.toRequestBody(mimeType.toMediaTypeOrNull())

                val postRequest =
                        Request.Builder()
                                .url(url)
                                .post(requestBody)
                                .header("User-Agent", userAgent)
                                .header(
                                        "Cookie",
                                        allCookies.entries.joinToString("; ") {
                                            "${it.key}=${it.value}"
                                        }
                                )
                                .build()

                client.newCall(postRequest).execute().use { response ->
                    val postSetCookies = response.headers("Set-Cookie")
                    postSetCookies.forEach { rawCookie ->
                        parseAndAddCookies(rawCookie, allCookies) // update if new cookies set
                    }

                    // Optionally also capture the response body if needed
                    val responseBody = response.body?.string() ?: ""
                    // You can store this or process it further if needed
                }

                return@withContext allCookies
            }

    // Add this helper method to parse cookies
    private fun parseAndAddCookies(rawCookie: String, cookiesMap: MutableMap<String, String>) {
        try {
            val httpCookies = HttpCookie.parse(rawCookie)
            httpCookies.forEach { cookie -> cookiesMap[cookie.name] = cookie.value }
        } catch (e: Exception) {
            // Fallback to manual parsing if HttpCookie parsing fails
            val mainPart = rawCookie.split(";")[0]
            val parts = mainPart.split("=", limit = 2)
            if (parts.size == 2) {
                val name = parts[0].trim()
                val value = parts[1].trim()
                cookiesMap[name] = value
            }
        }
    }

    // Add this method to your DdosGuardHelper class
    fun makePostRequestWithWebView(
            url: String,
            postBody: String,
            mimeType: String,
            promise: Promise
    ) {
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(reactContext)

            // Enable WebView debugging - helpful during development
            WebView.setWebContentsDebuggingEnabled(true)

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                userAgentString =
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }

            // Enable cookies
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)

            // Set up timeout handler and runnable
            val timeoutHandler = Handler(Looper.getMainLooper())
            val timeoutRunnable = Runnable {
                val allCookies = cookieManager.getCookie(url) ?: ""

                val result = WritableNativeMap()
                result.putString("cookies", allCookies)
                result.putString("url", webView.url ?: url)
                result.putString("response", "Timeout occurred")
                result.putString("status", "timeout")

                promise.resolve(result)

                // Clean up
                webView.stopLoading()
                webView.destroy()
            }

            // Log console messages for debugging
            webView.webChromeClient =
                    object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                            println("WebView Console: ${consoleMessage.message()}")
                            return true
                        }
                    }

            webView.webViewClient =
                    object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String) {
                            // Wait for JavaScript to execute and set cookies
                            // Some sites need extra time to run their scripts and set cookies
                            timeoutHandler.postDelayed(
                                    {
                                        // Check if we have the cookies we're looking for
                                        val currentCookies = cookieManager.getCookie(url) ?: ""

                                        // If you want to verify specific cookies exist, you can do
                                        // it here
                                        if (currentCookies.contains("addhash") &&
                                                        (currentCookies.contains("t_hat_") ||
                                                                currentCookies.contains("t_hash"))
                                        ) {
                                            // Found the cookies we need
                                            val result = WritableNativeMap()
                                            result.putString("cookies", currentCookies)
                                            result.putString("url", url)
                                            result.putString("response", "")
                                            result.putString("status", "success")

                                            promise.resolve(result)

                                            // Clean up
                                            timeoutHandler.removeCallbacks(timeoutRunnable)
                                            webView.stopLoading()
                                            webView.destroy()
                                        } else {
                                            // Extract page content to help with debugging
                                            view.evaluateJavascript(
                                                    "(function() { return document.body.innerText; })();",
                                                    { responseText ->
                                                        // If we still don't have the cookies after
                                                        // a delay,
                                                        // add a bit more time and inject some
                                                        // JavaScript to help find cookies
                                                        view.evaluateJavascript(
                                                                """
                                        (function() {
                                            // This will log all cookies to console
                                            console.log("All Cookies: " + document.cookie);
                                            
                                            // Force cookie synchronization
                                            document.cookie;
                                            
                                            // Return cookie info
                                            return document.cookie;
                                        })();
                                        """.trimIndent(),
                                                                { cookiesFromJS ->
                                                                    // Wait a bit more and then
                                                                    // check again
                                                                    timeoutHandler.postDelayed(
                                                                            {
                                                                                val finalCookies =
                                                                                        cookieManager
                                                                                                .getCookie(
                                                                                                        url
                                                                                                )
                                                                                                ?: ""

                                                                                val result =
                                                                                        WritableNativeMap()
                                                                                result.putString(
                                                                                        "cookies",
                                                                                        finalCookies
                                                                                )
                                                                                result.putString(
                                                                                        "url",
                                                                                        url
                                                                                )
                                                                                result.putString(
                                                                                        "response",
                                                                                        responseText
                                                                                                ?.replace(
                                                                                                        "\"",
                                                                                                        ""
                                                                                                )
                                                                                                ?: ""
                                                                                )
                                                                                result.putString(
                                                                                        "status",
                                                                                        "success"
                                                                                )

                                                                                promise.resolve(
                                                                                        result
                                                                                )

                                                                                // Clean up
                                                                                timeoutHandler
                                                                                        .removeCallbacks(
                                                                                                timeoutRunnable
                                                                                        )
                                                                                webView.stopLoading()
                                                                                webView.destroy()
                                                                            },
                                                                            2000
                                                                    )
                                                                }
                                                        )
                                                    }
                                            )
                                        }
                                    },
                                    3000
                            ) // Initial delay of 3 seconds after page load
                        }

                        override fun onReceivedError(
                                view: WebView,
                                errorCode: Int,
                                description: String,
                                failingUrl: String
                        ) {
                            promise.reject("WEBVIEW_ERROR", "WebView error: $description")
                            timeoutHandler.removeCallbacks(timeoutRunnable)
                            webView.stopLoading()
                            webView.destroy()
                        }
                    }

            // Set maximum timeout (30 seconds)
            timeoutHandler.postDelayed(timeoutRunnable, 30000)

            // For POST requests, we need to create a form and submit it
            val formHtml =
                    """
                <!DOCTYPE html>
                <html>
                <head><title>Form Submit</title></head>
                <body>
                    <form id="postForm" method="post" action="${url}" enctype="${mimeType}">
                        ${createFormFields(postBody)}
                    </form>
                    <script>
                        window.onload = function() {
                            console.log("Form submitting...");
                            document.getElementById('postForm').submit();
                        };
                    </script>
                </body>
                </html>
            """.trimIndent()

            // Load the HTML form
            webView.loadDataWithBaseURL(url, formHtml, "text/html", "UTF-8", null)
        }
    }

    // Helper function to create form fields from post body
    private fun createFormFields(postBody: String): String {
        // For URL-encoded format
        return postBody.split("&")
                .map { pair ->
                    val parts = pair.split("=", limit = 2)
                    val name = parts[0]
                    val value = if (parts.size > 1) parts[1] else ""
                    "<input type='hidden' name='$name' value='$value'>"
                }
                .joinToString("\n")
    }
}
