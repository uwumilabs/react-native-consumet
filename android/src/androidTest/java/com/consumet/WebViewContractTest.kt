package com.consumet

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Runs the Android WebView requests against a local HTTP server and checks the contract in
 * src/NativeConsumet.ts (NAT-1): a plain-string DDoS-Guard result, ignored sub-resource failures,
 * WEBVIEW_ERROR for a failed main document and TIMEOUT rejections.
 */
@RunWith(AndroidJUnit4::class)
class WebViewContractTest {
    companion object {
        // Nothing listens on port 1: connections are refused straight away.
        private const val REFUSED = "http://127.0.0.1:1/"
        private const val FAILING_IMAGE = "<img src=\"${REFUSED}missing.png\">"

        @BeforeClass
        @JvmStatic
        fun loadReactNative() {
            // WritableNativeMap (the GET result) needs React Native's native libraries.
            SoLoader.init(ApplicationProvider.getApplicationContext<Context>(), OpenSourceMergedSoMapping)
        }
    }

    private val context: Context = ApplicationProvider.getApplicationContext()
    private lateinit var server: LocalHttpServer

    @Before
    fun setUp() {
        server = LocalHttpServer(
            mapOf(
                "/ddg" to "<p>ddg</p>$FAILING_IMAGE<script>document.cookie = '__ddg2_=abc123; path=/';</script>",
                "/plain" to "<p id=\"marker\">plain page</p>$FAILING_IMAGE",
            )
        )
        clearCookies()
    }

    @After
    fun tearDown() {
        server.close()
        clearCookies()
    }

    @Test
    fun ddosGuardCookiesResolveAsPlainStringDespiteFailedSubresource() {
        val promise = TestPromise()
        DdosGuardHelper(context).getDdosGuardCookiesWithWebView(server.url("/ddg"), promise)

        promise.await(20)
        assertNull(promise.code)
        assertTrue("resolved ${promise.value?.javaClass}", promise.value is String)
        assertTrue(promise.value as String, (promise.value as String).contains("__ddg2_=abc123"))
        // Settles once even though the page also finished loading.
        Thread.sleep(2000)
        assertEquals(1, promise.settleCount)
    }

    @Test
    fun ddosGuardPageWithoutCookieRejectsWithCookieError() {
        val promise = TestPromise()
        DdosGuardHelper(context).getDdosGuardCookiesWithWebView(server.url("/plain"), promise)

        promise.await(20)
        assertEquals("COOKIE_ERROR", promise.code)
    }

    @Test
    fun failedMainDocumentRejectsWithWebViewError() {
        val promise = TestPromise()
        DdosGuardHelper(context).getDdosGuardCookiesWithWebView(REFUSED, promise)

        promise.await(20)
        assertEquals("WEBVIEW_ERROR", promise.code)
    }

    @Test
    fun getRequestIgnoresFailedSubresource() {
        val promise = TestPromise()
        HttpRequestModule(context).makeGetRequestWithWebView(server.url("/plain"), null, promise)

        promise.await(20)
        assertNull(promise.message, promise.code)
        val result = promise.value as ReadableMap
        assertEquals("success", result.getString("status"))
        assertEquals(server.url("/plain"), result.getString("url"))
        assertTrue(result.getString("html")!!.contains("plain page"))
    }

    @Test
    fun getRequestRejectsOnTimeout() {
        val promise = TestPromise()
        HttpRequestModule(context).makeGetRequestWithWebView(server.url("/hang"), null, promise)

        promise.await(WebViewTask.TIMEOUT_MS / 1000 + 15)
        assertEquals("TIMEOUT", promise.code)
        assertNull(promise.value)
    }

    private fun clearCookies() {
        val done = CountDownLatch(1)
        Handler(Looper.getMainLooper()).post {
            CookieManager.getInstance().removeAllCookies { done.countDown() }
        }
        assertTrue(done.await(10, TimeUnit.SECONDS))
    }
}
