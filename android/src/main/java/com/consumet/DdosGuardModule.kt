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
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import java.util.regex.Pattern
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request

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
        // Fix: Ensure we're getting a String from the match group
        val wellKnown = matcher.group(1) ?: ""

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

    fun makeGetRequestWithWebView(
    url: String,
    headers: ReadableMap?,
    promise: Promise
) {
    Handler(Looper.getMainLooper()).post {
        // Create and configure the WebView
        val webView = WebView(reactContext)
        
        // Enable WebView debugging during development
        WebView.setWebContentsDebuggingEnabled(true)
        
        // Configure WebView settings to mimic a browser
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            userAgentString = headers?.getString("User-Agent") ?: 
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        }
        
        // Enable cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)
        
        // Set up timeout handler
        val timeoutHandler = Handler(Looper.getMainLooper())
        val timeoutRunnable = Runnable {
            val allCookies = cookieManager.getCookie(url) ?: ""
            
            val result = WritableNativeMap()
            result.putString("url", webView.url ?: url)
            result.putString("cookies", allCookies)
            result.putString("status", "timeout")
            
            promise.resolve(result)
            
            // Clean up
            webView.stopLoading()
            webView.destroy()
        }
        
        // Log console messages for debugging
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                println("WebView Console: ${consoleMessage.message()}")
                return true
            }
        }
        
        // Handle page loading events
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, loadedUrl: String) {
                // Cancel the timeout since page is loaded
                timeoutHandler.removeCallbacks(timeoutRunnable)
                
                // Capture page content after a short delay to ensure JS execution
                timeoutHandler.postDelayed({
                    view.evaluateJavascript(
                        """
                        (function() {
                            try {
                                var content = document.documentElement.outerHTML;
                                var title = document.title;
                                return JSON.stringify({
                                    content: content,
                                    title: title
                                });
                            } catch(e) {
                                return JSON.stringify({
                                    error: e.message
                                });
                            }
                        })();
                        """.trimIndent()
                    ) { responseJson ->
                        // Get cookies
                        val cookies = cookieManager.getCookie(loadedUrl) ?: ""
                        
                        // Create result object
                        val result = WritableNativeMap()
                        result.putString("url", loadedUrl)
                        result.putString("response", responseJson)
                        result.putString("cookies", cookies)
                        result.putString("status", "success")
                        
                        promise.resolve(result)
                        
                        // Clean up
                        webView.stopLoading()
                        webView.destroy()
                    }
                }, 1500) // Wait 1.5 seconds for any JavaScript to execute
            }
            
            override fun onReceivedError(view: WebView, errorCode: Int, description: String, failingUrl: String) {
                timeoutHandler.removeCallbacks(timeoutRunnable)
                
                promise.reject("WEBVIEW_ERROR", "WebView error: $description")
                
                // Clean up
                webView.stopLoading()
                webView.destroy()
            }
        }
        
        // Set maximum timeout (30 seconds)
        timeoutHandler.postDelayed(timeoutRunnable, 30000)
        
        // Make the request with headers
        if (headers != null && headers.hasKey("User-Agent")) {
            val headerMap = mutableMapOf<String, String>()
            val iterator = headers.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                val value = headers.getString(key) ?: ""
        
                if (key.equals("Cookie", ignoreCase = true)) {
                    // 🔥 Manually set cookies in CookieManager
                    val cookiePairs = value.split(";")
                    for (cookie in cookiePairs) {
                        cookieManager.setCookie(url, cookie.trim())
                    }
                } else {
                    headerMap[key] = value
                }
            }
        
            webView.loadUrl(url, headerMap)
        } else {
            webView.loadUrl(url)
        }
        
    }
}
}