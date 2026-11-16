package com.consumet

import android.annotation.TargetApi
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
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
 * - [onPageFinished] runs once, when the main document first finishes loading. Load errors after
 *   that are ignored, and the callback settles the promise with [resolve] or [reject], at once or
 *   after polling the page (a challenge page that turns into the real page once solved).
 * - A main-frame load error rejects with [WEBVIEW_ERROR]. Failed sub-resources (images, scripts,
 *   iframes) are ignored, as WKWebView ignores them.
 * - A renderer process that dies rejects with [WEBVIEW_ERROR], whenever it happens.
 * - No settled promise within [TIMEOUT_MS] of [start] rejects with [TIMEOUT], whatever the
 *   callback is still waiting for (a page script that never returns, say).
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
    var onPageFinished: ((view: WebView) -> Unit)? = null

    /**
     * The URL of the page that finished loading last: after a challenge page, the page it turned
     * into, which [onPageFinished] (called for the first page only) doesn't see.
     */
    var finishedUrl: String? = null
        private set

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
                if (isSettled) return
                finishedUrl = loadedUrl
                if (pageFinished) return
                pageFinished = true
                onPageFinished?.invoke(view)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                // Only the main document decides the outcome.
                if (!request.isForMainFrame || pageFinished) return
                Log.e(TAG, "onReceivedError: ${error.description}")
                reject(WEBVIEW_ERROR, "WebView error: ${error.description}")
            }

            // Android 8+: unless a client returns true here, the system kills the app when the
            // renderer of one of its WebViews dies. The WebView can't be used again, so the task
            // settles and destroys it.
            @TargetApi(Build.VERSION_CODES.O)
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                val cause = if (detail.didCrash()) "crashed" else "was killed to free memory"
                Log.e(TAG, "WebView renderer $cause")
                reject(WEBVIEW_ERROR, "WebView renderer $cause")
                return true
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
