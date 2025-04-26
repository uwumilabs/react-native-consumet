package com.consumet

import android.webkit.CookieManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull  // Updated import
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.regex.Pattern
import android.webkit.WebView
import android.webkit.WebViewClient
import android.os.Handler
import android.os.Looper

class DdosGuardHelper(private val reactContext: ReactApplicationContext) {
    private val client = OkHttpClient.Builder().build()
    private val cookieManager = CookieManager.getInstance()

    fun bypassDdosGuard(url: String, promise: Promise) {
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
            val newCookie = getNewCookie(httpUrl) ?: run {
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

        val checkJsRequest = Request.Builder()
            .url("https://check.ddos-guard.net/check.js")
            .get()
            .build()

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
        val checkRequest = Request.Builder()
            .url(checkUrl)
            .get()
            .build()

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
    
            webView.webViewClient = object : WebViewClient() {
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
}