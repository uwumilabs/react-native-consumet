package com.consumet

import android.os.Handler
import android.os.Looper
import android.webkit.*
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule

@ReactModule(name = ConsumetModule.NAME)
class ConsumetModule(private val reactContext: ReactApplicationContext) :
        NativeConsumetSpec(reactContext), TurboModule {
    private val handler by lazy { Handler(Looper.getMainLooper()) }
    private val tag by lazy { javaClass.simpleName }
    private val ddosGuardHelper by lazy { DdosGuardHelper(reactContext) }
    private val deobfuscator by lazy { DeobfuscatorModule(reactContext) }
    private val httpRequestModule by lazy { HttpRequestModule(reactContext) }

    companion object {
        const val NAME = "Consumet"
        private const val TIMEOUT_SEC: Long = 90
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    override fun multiply(a: Double, b: Double): Double {
        Log.d("multiply", "Multiplying $a * $b")
        return a * b
    }

    @ReactMethod
    override fun bypassDdosGuard(url: String, promise: Promise) {
        ddosGuardHelper.bypassDdosGuard(url, promise)
    }

    @ReactMethod
    override fun getDdosGuardCookiesWithWebView(url: String, promise: Promise) {
        ddosGuardHelper.getDdosGuardCookiesWithWebView(url, promise)
    }

    @ReactMethod
    override fun makeGetRequestWithWebView(url: String, headers: ReadableMap, promise: Promise) {
        httpRequestModule.makeGetRequestWithWebView(url, headers, promise)
    }

    @ReactMethod
    override fun makePostRequestWithWebView(url: String, headers: ReadableMap, body: String, promise: Promise) {
        httpRequestModule.makePostRequestWithWebView(url, headers, body, promise)
    }

    @ReactMethod
    override fun makePostRequest(url: String, headers: ReadableMap, body: String, promise: Promise) {
        httpRequestModule.makePostRequest(url, headers, body, promise)
    }

    @ReactMethod
    override fun deobfuscateScript(source: String, promise: Promise) {
        deobfuscator.deobfuscateScript(source, promise)
    }
}
