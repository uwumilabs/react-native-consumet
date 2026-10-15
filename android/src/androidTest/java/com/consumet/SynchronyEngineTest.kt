package com.consumet

import android.system.Os
import android.system.OsConstants
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.Callable
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit

/**
 * Loads the QuickJS engine behind deobfuscateScript on a device and runs the pinned Synchrony
 * script in it (NAT-2). On a 16 KB page-size device this also proves the native library loads.
 * Needs network access for the Synchrony script.
 */
@RunWith(AndroidJUnit4::class)
class SynchronyEngineTest {
    companion object {
        private lateinit var script: String

        @BeforeClass
        @JvmStatic
        fun downloadSynchrony() {
            Log.i("SynchronyEngineTest", "page size: ${Os.sysconf(OsConstants._SC_PAGESIZE)}")
            val request = Request.Builder().url(Synchrony.SCRIPT_URL).build()
            script = OkHttpClient().newCall(request).execute().use { Synchrony.prepare(it.body!!.string()) }
        }

        /** Runs [block] on a thread with the stack size the module uses. */
        private fun <T> onDeobfuscatorThread(block: () -> T): T {
            val task = FutureTask(Callable(block))
            Thread(null, task, "test-deobfuscator", Synchrony.THREAD_STACK_BYTES).start()
            return try {
                task.get(60, TimeUnit.SECONDS)
            } catch (e: java.util.concurrent.ExecutionException) {
                throw e.cause!!
            }
        }
    }

    @Test
    fun deobfuscatesObfuscatorOutput() {
        val result = onDeobfuscatorThread {
            Synchrony.deobfuscate(script, "var _0x1=['\\x68\\x65\\x6c\\x6c\\x6f'];console.log(_0x1[0]);")
        }

        assertEquals("var _0x1 = ['hello'];\nconsole.log(_0x1[0]);", result)
    }

    @Test
    fun keepsPackedScriptsReadable() {
        val packed =
            "(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c]);return p}" +
                "('0 1={2:\"3\"}',4,4,'var|player|file|master'.split('|')))"

        val result = onDeobfuscatorThread { Synchrony.deobfuscate(script, packed) }

        assertTrue(result as String, result.contains("'var|player|file|master'.split('|')"))
    }

    @Test
    fun invalidSourceThrowsSoTheModuleRejects() {
        val error = assertThrows(Throwable::class.java) {
            onDeobfuscatorThread { Synchrony.deobfuscate(script, "function (") }
        }

        assertTrue(error.message ?: "", error.message!!.contains("Unexpected token"))
    }
}
