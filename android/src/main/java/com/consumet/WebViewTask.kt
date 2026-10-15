package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise

/**
 * One hidden WebView load for a promise-returning request: the Android counterpart of
 * RCConsumetWebTask on iOS, so both platforms follow the contract in src/NativeConsumet.ts.
 * Main thread only.
 *
 * The promise settles exactly once:
 * - [onPageFinished] runs once, when the main document first finishes loading. Errors after
 *   that are ignored and the callback settles the promise with [resolve] or [reject].
 * - A main-frame load error rejects with [WEBVIEW_ERROR]. Failed sub-resources (images, scripts,
 *   iframes) are ignored, as WKWebView ignores them.
 * - No finished page within [TIMEOUT_MS] rejects with [TIMEOUT].
 */
internal class WebViewTask(
    context: Context,
    private val promise: Promise,
    userAgent: String? = null,
) {
    companion object {
        private const val TAG = "WebViewTask"
        const val WEBVIEW_ERROR = "WEBVIEW_ERROR"
        const val TIMEOUT = "TIMEOUT"
        const val TIMEOUT_MS = 30_000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private val timeout = Runnable { reject(TIMEOUT, "WebView request timed out") }
    private var pageFinished = false

    var isSettled = false
        private set

    /** Called once, when the main document first finishes loading. */
    var onPageFinished: ((view: WebView, loadedUrl: String) -> Unit)? = null

    val webView: WebView

    init {
        // Inspectable only in debuggable host apps (see WebViewDebugging)
        WebViewDebugging.enableIfHostAppDebuggable(context)
        webView = WebView(context)
        @Suppress("DEPRECATION")
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            if (userAgent != null) userAgentString = userAgent
        }
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)
    }

    /** Installs the WebView client, starts the timeout and lets [load] start the navigation. */
    fun start(load: (WebView) -> Unit) {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, loadedUrl: String) {
                if (isSettled || pageFinished) return
                pageFinished = true
                handler.removeCallbacks(timeout)
                onPageFinished?.invoke(view, loadedUrl)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                // Only the main document decides the outcome.
                if (!request.isForMainFrame || pageFinished) return
                Log.e(TAG, "onReceivedError: ${error.description}")
                reject(WEBVIEW_ERROR, "WebView error: ${error.description}")
            }
        }
        handler.postDelayed(timeout, TIMEOUT_MS)
        load(webView)
    }

    fun resolve(value: Any?) = settle { promise.resolve(value) }

    fun reject(code: String, message: String) = settle { promise.reject(code, message) }

    private inline fun settle(block: () -> Unit) {
        if (isSettled) return
        isSettled = true
        handler.removeCallbacks(timeout)
        block()
        // Not from inside the WebViewClient callback that settled the promise.
        handler.post { webView.destroy() }
    }
}
