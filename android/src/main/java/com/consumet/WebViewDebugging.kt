package com.consumet

import android.content.Context
import android.content.pm.ApplicationInfo
import android.webkit.WebView

/**
 * Remote WebView debugging (chrome://inspect) is a process-wide switch: turning it on makes every
 * WebView in the host app inspectable, not only the ones this module creates. It is enabled only
 * when the host app is debuggable.
 *
 * The check reads the host app's [ApplicationInfo.FLAG_DEBUGGABLE] rather than this library's
 * `BuildConfig.DEBUG`. A library's BuildConfig describes the variant the library was compiled in,
 * which can differ from the app's: a prebuilt AAR, an app build type that falls back to the
 * library's release variant, or a release build marked debuggable. FLAG_DEBUGGABLE is what Android
 * uses for the installed app, and the WebView remote-debugging guide recommends this check.
 */
internal object WebViewDebugging {
    @Volatile
    private var applied = false

    fun isDebuggable(applicationFlags: Int): Boolean =
        (applicationFlags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    /**
     * Enables WebView debugging when the host app is debuggable. Call on the main thread before
     * creating a WebView. Never turns debugging off, so a host app that enabled it keeps it.
     */
    fun enableIfHostAppDebuggable(context: Context) {
        if (applied) return
        applied = true
        if (isDebuggable(context.applicationInfo.flags)) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }
}
