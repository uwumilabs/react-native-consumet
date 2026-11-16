package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap
import okhttp3.Cookie
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Request

/** bypassDdosGuard and getDdosGuardCookiesWithWebView. */
internal class DdosGuardHelper(private val context: Context) {
    private val cookieManager = CookieManager.getInstance()

    companion object {
        private const val TAG = "DdosGuardModule"

        /** The cookie a passed DDoS-Guard check sets. */
        const val CHECK_COOKIE = "__ddg2_"

        /** Names, between single quotes, the path on the protected host that sets [CHECK_COOKIE]. */
        const val CHECK_SCRIPT_URL = "https://check.ddos-guard.net/check.js"
    }

    fun bypassDdosGuard(url: String, promise: Promise) {
        Log.d(TAG, "bypassDdosGuard called with url: $url")
        try {
            val httpUrl = url.toHttpUrlOrNull() ?: run {
                promise.reject("ERROR", "Invalid URL")
                return
            }

            val oldCookies = cookieManager.getCookie(url).orEmpty().split(";").mapNotNull {
                Cookie.parse(httpUrl, it.trim())
            }
            if (oldCookies.lastOrNull { it.name == CHECK_COOKIE }?.value?.isNotEmpty() == true) {
                Log.d(TAG, "Existing __ddg2_ cookie found.")
                val result = WritableNativeMap()
                result.putString("cookie", cookiesToHeaderString(oldCookies))
                promise.resolve(result)
                return
            }

            Log.d(TAG, "No valid __ddg2_ cookie, attempting to get a new one.")
            // The check requests block, so they run off the main thread.
            Thread {
                try {
                    val newCookie = getNewCookie(httpUrl)
                    Handler(Looper.getMainLooper()).post {
                        if (newCookie != null) {
                            val result = WritableNativeMap()
                            result.putString("cookie", cookiesToHeaderString(oldCookies + newCookie))
                            promise.resolve(result)
                        } else {
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

    /**
     * The cookie the check path named by [CHECK_SCRIPT_URL] sets on [url]'s host, or null when the
     * script names no path or the check sets no cookie. Throws when a request fails.
     */
    private fun getNewCookie(url: HttpUrl): Cookie? {
        val checkScript = Request.Builder().url(CHECK_SCRIPT_URL).get().build()
        val wellKnown = HttpClients.ddosGuard.newCall(checkScript).execute().use { response ->
            (response.body?.string() ?: "").substringAfter("'", "").substringBefore("'", "")
        }
        if (wellKnown.isEmpty()) {
            Log.d(TAG, "check.js names no check path")
            return null
        }

        Log.d(TAG, "wellKnown path: $wellKnown")
        val check = Request.Builder().url("${url.scheme}://${url.host}$wellKnown").get().build()
        return HttpClients.ddosGuard.newCall(check).execute().use { response ->
            response.header("set-cookie")?.let { Cookie.parse(url, it) }
        }
    }

    private fun cookiesToHeaderString(cookies: List<Cookie>): String =
        cookies.joinToString("; ") { "${it.name}=${it.value}" }

    /**
     * Loads [url] in a hidden WebView and resolves with the Cookie header string for the loaded
     * URL once it holds a [CHECK_COOKIE] cookie (a plain string, as the spec and iOS return). Rejects
     * with COOKIE_ERROR when the page sets none, WEBVIEW_ERROR when the main document fails to
     * load, and TIMEOUT after 30 seconds.
     */
    fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        Log.d(TAG, "getDdosGuardCookiesWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
            val task = WebViewTask(context, promise)
            task.onPageFinished = { _, loadedUrl ->
                Log.d(TAG, "onPageFinished for url: $loadedUrl")
                Thread {
                    val cookie = cookieManager.getCookie(loadedUrl)
                    val hasCheckCookie = cookie?.split(";")?.any { it.trim().substringBefore("=") == CHECK_COOKIE } == true

                    Handler(Looper.getMainLooper()).post {
                        if (hasCheckCookie) {
                            task.resolve(cookie)
                        } else {
                            task.reject("COOKIE_ERROR", "No $CHECK_COOKIE cookie received")
                        }
                    }
                }.start()
            }

            Log.d(TAG, "Loading url in WebView: $url")
            task.start { webView -> webView.loadUrl(url) }
        }
    }
}
