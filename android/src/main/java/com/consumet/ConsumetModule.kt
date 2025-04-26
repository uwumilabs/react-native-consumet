package com.consumet

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.*
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@ReactModule(name = ConsumetModule.NAME)
class ConsumetModule(private val reactContext: ReactApplicationContext) :
        NativeConsumetSpec(reactContext), TurboModule {
    private val handler by lazy { Handler(Looper.getMainLooper()) }
    private val tag by lazy { javaClass.simpleName }
    private val ddosGuardHelper by lazy { DdosGuardHelper(reactContext) }

    class JsInterface(
            private val latch: CountDownLatch,
            private val context: ReactApplicationContext
    ) {
        var result: String? = null

        @JavascriptInterface
        fun setResponse(response: String) {
            Log.d("ConsumetModule", "script result: $response")
            result = response
            latch.countDown()
        }

        @JavascriptInterface
        fun loadLocalAsset(filename: String): String {
            return try {
                context.assets.open(filename).bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                Log.e("ConsumetModule", "Failed to load local asset: $filename", e)
                "console.error('Failed to load $filename: ${e.message}');"
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun getSources(xrax: String, promise: Promise) {
        val latch = CountDownLatch(1)
        var webView: WebView? = null
        val jsi = JsInterface(latch, reactContext)

        handler.post {
            val webview = WebView(reactContext)
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

            webview.webViewClient =
                    object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)

                            val cdnScript =
                                    """
                        (async function() {
                            async function loadScriptWithFallback(url, localFilename) {
                                try {
                                    console.log("Loading from CDN: " + url);
                                    await new Promise((resolve, reject) => {
                                        const script = document.createElement('script');
                                        script.src = url;
                                        script.onload = () => resolve();
                                        script.onerror = () => reject(new Error("CDN failed"));
                                        document.head.appendChild(script);
                                        setTimeout(() => reject(new Error("CDN timeout")), 5000);
                                    });
                                } catch (e) {
                                    console.warn("Falling back to local asset: " + localFilename);
                                    const localScript = window.jsinterface.loadLocalAsset(localFilename);
                                    eval(localScript);
                                }
                            }

                            try {
                                await loadScriptWithFallback("https://cdn.jsdelivr.net/gh/Kohi-den/extensions-source@main/lib/megacloud-extractor/src/main/assets/crypto-js.js", "crypto-js.js");
                                await loadScriptWithFallback("https://cdn.jsdelivr.net/gh/Kohi-den/extensions-source@main/lib/megacloud-extractor/src/main/assets/megacloud.decodedpng.js", "megacloud.decodedpng.js");
                                await loadScriptWithFallback("https://cdn.jsdelivr.net/gh/Kohi-den/extensions-source@main/lib/megacloud-extractor/src/main/assets/megacloud.getsrcs.js", "megacloud.getsrcs.js");

                                console.log("Calling getSources...");
                                const result = await getSources("${xrax}");
                                window.jsinterface.setResponse(JSON.stringify(result));
                            } catch (err) {
                                console.error("Execution error:", err);
                                window.jsinterface.setResponse("ERROR: " + err.message);
                            }
                        })();
                    """.trimIndent()

                            view?.evaluateJavascript(cdnScript, null)
                        }

                        override fun onReceivedError(
                                view: WebView?,
                                errorCode: Int,
                                description: String?,
                                failingUrl: String?
                        ) {
                            Log.e(tag, "WebView error: $errorCode - $description @ $failingUrl")
                            super.onReceivedError(view, errorCode, description, failingUrl)
                        }
                    }

            webview.webChromeClient =
                    object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                            Log.d(
                                    tag,
                                    "Console: [${consoleMessage?.messageLevel()}] ${consoleMessage?.message()}"
                            )
                            return super.onConsoleMessage(consoleMessage)
                        }
                    }

            val headers = mapOf("X-Requested-With" to "org.lineageos.jelly")
            webview.loadUrl("https://megacloud.tv/about", headers)
        }

        // Await result or timeout
        Thread {
                    val success = latch.await(TIMEOUT_SEC, TimeUnit.SECONDS)

                    handler.post {
                        webView?.stopLoading()
                        webView?.destroy()
                        webView = null

                        if (success && jsi.result != null) {
                            promise.resolve(jsi.result)
                        } else {
                            promise.reject("ERROR", "Failed to get sources or timeout2")
                        }
                    }
                }
                .start()
    }

    companion object {
        const val NAME = "Consumet"
        private const val TIMEOUT_SEC: Long = 90
    }

    @ReactMethod
    override fun bypassDdosGuard(url: String, promise: Promise) {
        ddosGuardHelper.bypassDdosGuard(url, promise)
    }

    @ReactMethod
    override fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        ddosGuardHelper.getDdosGuardCookiesWithWebView(url, promise)
    }
}
