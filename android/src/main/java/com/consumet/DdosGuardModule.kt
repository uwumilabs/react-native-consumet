package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request

class DdosGuardHelper(private val context: Context) {
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
                setCookieHeader?.let { Cookie.parse(url, it) }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception in getNewCookie: ${e.message}", e)
            null
        }
    }

    private fun cookiesToHeaderString(cookies: List<Cookie>): String =
        cookies.joinToString("; ") { "${it.name}=${it.value}" }

    /**
     * Loads [url] in a hidden WebView and resolves with the Cookie header string for the loaded
     * URL once it holds a `__ddg2_` cookie (a plain string, as the spec and iOS return). Rejects
     * with COOKIE_ERROR when the page sets none, WEBVIEW_ERROR when the main document fails to
     * load, and TIMEOUT after 30 seconds.
     */
    fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        Log.d(TAG, "getDdosGuardCookiesWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
            val task = WebViewTask(context, promise)
            task.onPageFinished = { _, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                // Run on background thread to avoid ANR
                Thread {
                    val cookie = cookieManager.getCookie(loadedUrl)
                    val hasDdg2 = cookie?.split(";")?.any { it.trim().substringBefore("=") == "__ddg2_" } == true

                    Handler(Looper.getMainLooper()).post {
                        if (hasDdg2) {
                            task.resolve(cookie)
                        } else {
                            task.reject("COOKIE_ERROR", "No __ddg2_ cookie received")
                        }
                    }
                }.start()
            }

            Log.d(TAG, "Loading url in WebView: $url")
            task.start { webView -> webView.loadUrl(url) }
        }
    }
}
