package com.consumet

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ConsoleMessage
import androidx.annotation.NonNull
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@ReactModule(name = ConsumetModule.NAME)
class ConsumetModule(reactContext: ReactApplicationContext) : NativeConsumetSpec(reactContext) {
    private val handler by lazy { Handler(Looper.getMainLooper()) }
    private val tag by lazy { javaClass.simpleName }

    class JsInterface(private val latch: CountDownLatch) {
        var result: String? = null

        @JavascriptInterface
        fun setResponse(response: String) {
            Log.d("ConsumetModule", "script result: $response")
            result = response
            latch.countDown()
        }
    }

    private fun getJsContent(file: String): String {
        return reactApplicationContext.assets.open(file).bufferedReader().use { it.readText() }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun getSources(xrax: String, promise: Promise) {
        val latch = CountDownLatch(1)
        var webView: WebView? = null
        val jsi = JsInterface(latch)

        handler.post {
            val webview = WebView(reactApplicationContext)
            webView = webview
            with(webview.settings) {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                useWideViewPort = false
                loadWithOverviewMode = false
                userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            webview.addJavascriptInterface(jsi, "jsinterface")

            webview.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    Log.d(tag, "onPageFinished $url")
                    super.onPageFinished(view, url)

                    Log.d(tag, "injecting scripts")
                    // Adjust paths to match your assets folder structure
                    view?.evaluateJavascript(getJsContent("crypto-js.js")) {}
                    view?.evaluateJavascript(getJsContent("megacloud.decodedpng.js")) {}
                    view?.evaluateJavascript(getJsContent("megacloud.getsrcs.js")) {}

                    Log.d(tag, "running script")
                    view?.evaluateJavascript(
                        "getSources(\"${xrax}\")" +
                            ".then( s => jsinterface.setResponse( JSON.stringify(s) ) )",
                    ) {}
                }
            }

            webview.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d(
                        tag,
                        "Chrome: [${consoleMessage?.messageLevel()}]" +
                            "${consoleMessage?.message()}" +
                            " at ${consoleMessage?.lineNumber()}" +
                            " in ${consoleMessage?.sourceId()}",
                    )
                    return super.onConsoleMessage(consoleMessage)
                }
            }

            val headers = mapOf("X-Requested-With" to "org.lineageos.jelly")
            webView?.loadUrl("https://megacloud.tv/about", headers)
        }

        // Run in a separate thread to not block the JS thread
        Thread {
            val success = latch.await(TIMEOUT_SEC, TimeUnit.SECONDS)
            
            handler.post {
                webView?.stopLoading()
                webView?.destroy()
                webView = null
                
                if (success && jsi.result != null) {
                    promise.resolve(jsi.result)
                } else {
                    promise.reject("ERROR", "Failed to get sources or timeout")
                }
            }
        }.start()
    }

    companion object {
        const val NAME = "Consumet"
        private const val TIMEOUT_SEC: Long = 30
    }
}