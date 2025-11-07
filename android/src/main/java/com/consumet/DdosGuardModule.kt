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
}
