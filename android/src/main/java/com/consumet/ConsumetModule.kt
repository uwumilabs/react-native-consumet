package com.consumet

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.*
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
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
    private val deobfuscator by lazy { DeobfuscatorModule(reactContext) }

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

    @ReactMethod
    override fun makeGetRequestWithWebView(url: String, headers: ReadableMap, promise: Promise) {
        ddosGuardHelper.makeGetRequestWithWebView(url, headers, promise)
    }

    @ReactMethod
    override fun deobfuscateScript(source: String, promise: Promise) {
        deobfuscator.deobfuscateScript(source, promise)
    }
}
