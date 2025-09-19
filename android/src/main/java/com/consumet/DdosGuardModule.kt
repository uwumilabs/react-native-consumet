package com.consumet

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
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
    private val TAG = "DdosGuardModule"

    companion object {
        private val ERROR_CODES = listOf(403)
        private val SERVER_CHECK = listOf("ddos-guard")
    }

    fun bypassDdosGuard(url: String, promise: Promise) {
        Log.d(TAG, "bypassDdosGuard called with url: $url")
        try {
            val httpUrl = url.toHttpUrlOrNull() ?: run {
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
                        if (cookie.name == "__ddg2_") { // Fixed: should be "__ddg2_" not "__ddg2"
                            ddg2Cookie = cookie
                        }
                    }
                }
            }

            if (ddg2Cookie != null && ddg2Cookie!!.value.isNotEmpty()) {
                Log.d(TAG, "Existing __ddg2_ cookie found.")
                val result = WritableNativeMap()
                result.putString("cookie", cookiesToHeaderString(oldCookies))
                promise.resolve(result)
                return
            }

            Log.d(TAG, "No valid __ddg2_ cookie, attempting to get a new one.")
            // Get new cookie on background thread to avoid ANR
            Thread {
                try {
                    val newCookie = getNewCookie(httpUrl)
                    if (newCookie != null) {
                        Log.d(TAG, "Successfully retrieved new cookie.")
                        oldCookies.add(newCookie)
                        val newCookieHeader = cookiesToHeaderString(oldCookies)

                        Handler(Looper.getMainLooper()).post {
                            val result = WritableNativeMap()
                            result.putString("cookie", newCookieHeader)
                            promise.resolve(result)
                        }
                    } else {
                        Log.d(TAG, "Failed to get new cookie.")
                        Handler(Looper.getMainLooper()).post {
                            promise.reject("ERROR", "Failed to get DDos-Guard cookie")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Exception in bypassDdosGuard thread: ${e.message}", e)
                    Handler(Looper.getMainLooper()).post {
                        promise.reject("ERROR", e.message, e)
                    }
                }
            }.start()
        } catch (e: Exception) {
            Log.e(TAG, "Exception in bypassDdosGuard: ${e.message}", e)
            promise.reject("ERROR", e.message, e)
        }
    }

    private fun getNewCookie(url: okhttp3.HttpUrl): Cookie? {
        Log.d(TAG, "getNewCookie called for url: $url")
        return try {
            val cookies = cookieManager.getCookie(url.toString())
            val oldCookies = mutableListOf<Cookie>()
            var ddg2Cookie: Cookie? = null

            if (!cookies.isNullOrEmpty()) {
                cookies.split(";").forEach { cookieStr ->
                    Cookie.parse(url, cookieStr.trim())?.let { cookie ->
                        oldCookies.add(cookie)
                        if (cookie.name == "__ddg2_") { // Fixed: should be "__ddg2_"
                            ddg2Cookie = cookie
                        }
                    }
                }
            }

            if (ddg2Cookie != null && ddg2Cookie!!.value.isNotEmpty()) {
                Log.d(TAG, "Found existing __ddg2_ cookie in getNewCookie.")
                return ddg2Cookie
            }

            Log.d(TAG, "Fetching check.js for DDOS guard.")
            // Use .use{} for proper resource management
            val checkJsRequest = Request.Builder()
                .url("https://check.ddos-guard.net/check.js")
                .get()
                .build()

            val wellKnown = client.newCall(checkJsRequest).execute().use { response ->
                val body = response.body?.string() ?: ""
                // More robust extraction matching original logic
                body.substringAfter("'", "").substringBefore("'", "")
            }

            if (wellKnown.isEmpty()) {
                Log.d(TAG, "wellKnown is empty, cannot proceed.")
                return null
            }

            Log.d(TAG, "wellKnown path: $wellKnown")
            val checkUrl = "${url.scheme}://${url.host}$wellKnown"
            val checkRequest = Request.Builder().url(checkUrl).get().build()

            client.newCall(checkRequest).execute().use { response ->
                val setCookieHeader = response.header("set-cookie")
                Log.d(TAG, "set-cookie header: $setCookieHeader")
                setCookieHeader?.let { Cookie.parse(url, it) }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in getNewCookie: ${e.message}", e)
            null
        }
    }

    private fun cookiesToHeaderString(cookies: List<Cookie>): String {
        val cookieString = cookies.joinToString("; ") { "${it.name}=${it.value}" }
        Log.d(TAG, "cookiesToHeaderString: $cookieString")
        return cookieString
    }

    fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        Log.d(TAG, "getDdosGuardCookiesWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(reactContext)
            webView.settings.javaScriptEnabled = true
            webView.settings.domStorageEnabled = true
            
            // Add timeout handling
            val timeoutHandler = Handler(Looper.getMainLooper())
            val timeoutRunnable = Runnable {
                Log.d(TAG, "WebView timeout reached for $url")
                promise.reject("TIMEOUT", "WebView timeout reached")
                webView.destroy()
            }

            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, loadedUrl: String) {
                    Log.d(TAG, "onPageFinished for url: $loadedUrl")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    
                    // Run on background thread to avoid ANR
                    Thread {
                        val cookieManager = android.webkit.CookieManager.getInstance()
                        val cookie = cookieManager.getCookie(loadedUrl)
                        Log.d(TAG, "Cookies from WebView: $cookie")
                        
                        Handler(Looper.getMainLooper()).post {
                            if (!cookie.isNullOrEmpty() && cookie.contains("__ddg2_")) {
                                val result = WritableNativeMap()
                                result.putString("cookie", cookie)
                                promise.resolve(result)
                            } else {
                                promise.reject("COOKIE_ERROR", "No __ddg2_ cookie received")
                            }
                            webView.destroy()
                        }
                    }.start()
                }
                
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    Log.e(TAG, "onReceivedError: ${error.description}")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    promise.reject("WEBVIEW_ERROR", "WebView error: ${error.description}")
                    webView.destroy()
                }
            }
            
            // Set 30 second timeout
            Log.d(TAG, "Loading url in WebView: $url")
            timeoutHandler.postDelayed(timeoutRunnable, 30000)
            webView.loadUrl(url)
        }
    }

    fun makeGetRequestWithWebView(url: String, headers: ReadableMap?, promise: Promise) {
        Log.d(TAG, "makeGetRequestWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
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
            Log.d(TAG, "User-Agent: ${webView.settings.userAgentString}")
            
            // Enable cookies
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)
            
            // Set up timeout handler
            val timeoutHandler = Handler(Looper.getMainLooper())
            val timeoutRunnable = Runnable {
                Log.d(TAG, "Timeout in makeGetRequestWithWebView for url: $url")
                val allCookies = cookieManager.getCookie(url) ?: ""
                
                val result = WritableNativeMap()
                result.putString("url", webView.url ?: url)
                result.putString("cookies", allCookies)
                result.putString("status", "timeout")
                
                promise.resolve(result)
                webView.destroy()
            }
            
            // Log console messages for debugging
            webView.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                    Log.d(TAG, "WebView Console: ${consoleMessage.message()}")
                    return true
                }
            }
            
            // Handle page loading events
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, loadedUrl: String) {
                    Log.d(TAG, "onPageFinished for url: $loadedUrl")
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
                        ) { responseJson: String? ->
                            val cookies = cookieManager.getCookie(loadedUrl) ?: ""
                            Log.d(TAG, "onPageFinished cookies: $cookies")
                            
                            val result = WritableNativeMap()
                            result.putString("url", loadedUrl)
                            result.putString("response", responseJson)
                            result.putString("cookies", cookies)
                            result.putString("status", "success")
                            
                            promise.resolve(result)
                            webView.destroy()
                        }
                    }, 1500)
                }
                
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    Log.e(TAG, "onReceivedError: ${error.description}")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    promise.reject("WEBVIEW_ERROR", "WebView error: ${error.description}")
                    webView.destroy()
                }
            }
            
            // Set maximum timeout (30 seconds)
            timeoutHandler.postDelayed(timeoutRunnable, 30000)
            
            // Process headers and make request
            val headerMap = mutableMapOf<String, String>()
            
            headers?.let { headersMap ->
                val iterator = headersMap.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    val value = headersMap.getString(key) ?: ""
                    
                    if (key.equals("Cookie", ignoreCase = true)) {
                        // Set cookies in CookieManager
                        Log.d(TAG, "Setting cookies from headers: $value")
                        val cookiePairs = value.split(";")
                        for (cookie in cookiePairs) {
                            cookieManager.setCookie(url, cookie.trim())
                        }
                    } else {
                        headerMap[key] = value
                    }
                }
            }
            
            Log.d(TAG, "Loading url with headers: $headerMap")
            if (headerMap.isNotEmpty()) {
                webView.loadUrl(url, headerMap)
            } else {
                webView.loadUrl(url)
            }
        }
    }
}