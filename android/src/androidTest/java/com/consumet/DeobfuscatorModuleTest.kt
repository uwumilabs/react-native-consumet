package com.consumet

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicInteger

/**
 * deobfuscateScript with its Synchrony cache (NAT-3): one download for many calls, a saved copy
 * with the pinned SHA-256, and NetworkError for a download that is tampered with or fails. The
 * tests that run Synchrony need network access.
 */
@RunWith(AndroidJUnit4::class)
class DeobfuscatorModuleTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val dir = File(context.cacheDir, "deobfuscator-module-test").apply { deleteRecursively() }
    private val source = "var _0x1=['\\x68\\x65\\x6c\\x6c\\x6f'];console.log(_0x1[0]);"
    private val deobfuscated = "var _0x1 = ['hello'];\nconsole.log(_0x1[0]);"

    @After
    fun tearDown() {
        dir.deleteRecursively()
    }

    private fun DeobfuscatorModule.call(): TestPromise =
        TestPromise().also {
            deobfuscateScript(source, it)
            it.await(90)
        }

    @Test
    fun downloadsSynchronyOnceAndSavesTheVerifiedScript() {
        val downloads = AtomicInteger()
        val module = DeobfuscatorModule(
            SynchronyScriptCache(dir) {
                downloads.incrementAndGet()
                DeobfuscatorModule.downloadScript()
            }
        )

        repeat(3) {
            val promise = module.call()
            assertNull(promise.message, promise.code)
            assertEquals(deobfuscated, promise.value)
        }

        assertEquals(1, downloads.get())
        val saved = File(dir, "synchrony-${Synchrony.SCRIPT_SHA256}.js")
        assertEquals(Synchrony.SCRIPT_SHA256, sha256Hex(saved.readBytes()))
    }

    @Test
    fun theDefaultCacheIsSavedInTheAppCacheDirectory() {
        val promise = DeobfuscatorModule(context).call()

        assertNull(promise.message, promise.code)
        assertEquals(deobfuscated, promise.value)
        val saved = File(context.cacheDir, "consumet/synchrony-${Synchrony.SCRIPT_SHA256}.js")
        assertEquals(Synchrony.SCRIPT_SHA256, sha256Hex(saved.readBytes()))
    }

    @Test
    fun rejectsATamperedDownloadWithNetworkError() {
        val tampered = "export{evil as Deobfuscator,x as Transformer};".toByteArray()

        val promise = DeobfuscatorModule(SynchronyScriptCache(dir) { tampered }).call()

        assertEquals("NetworkError", promise.code)
        assertTrue(promise.message!!, promise.message!!.contains("failed its integrity check"))
        assertTrue("nothing saved", dir.listFiles().isNullOrEmpty())
    }

    @Test
    fun rejectsAFailedDownloadWithNetworkError() {
        val promise = DeobfuscatorModule(SynchronyScriptCache(dir) { throw IOException("HTTP 404: Not Found") }).call()

        assertEquals("NetworkError", promise.code)
        assertEquals("HTTP 404: Not Found", promise.message)
    }
}
