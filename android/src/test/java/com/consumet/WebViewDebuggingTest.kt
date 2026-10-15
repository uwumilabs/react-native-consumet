package com.consumet

import android.content.pm.ApplicationInfo
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WebViewDebuggingTest {
    @Test
    fun debuggableHostAppEnablesWebViewDebugging() {
        assertTrue(WebViewDebugging.isDebuggable(ApplicationInfo.FLAG_DEBUGGABLE))
        assertTrue(
            WebViewDebugging.isDebuggable(ApplicationInfo.FLAG_DEBUGGABLE or ApplicationInfo.FLAG_HAS_CODE)
        )
    }

    @Test
    fun releaseHostAppKeepsWebViewDebuggingOff() {
        assertFalse(WebViewDebugging.isDebuggable(0))
        assertFalse(WebViewDebugging.isDebuggable(ApplicationInfo.FLAG_HAS_CODE or ApplicationInfo.FLAG_ALLOW_BACKUP))
    }
}
