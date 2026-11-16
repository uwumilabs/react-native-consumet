package com.consumet

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import okhttp3.Request
import java.io.File
import java.io.IOException

/** deobfuscateScript: runs Synchrony on a script. The Synchrony script itself comes from [scripts]. */
internal class DeobfuscatorModule(private val scripts: SynchronyScriptCache) {

    constructor(context: Context) : this(scriptCache(context))

    fun deobfuscateScript(source: String, promise: Promise) {
        Thread(null, { run(source, promise) }, "ConsumetDeobfuscator", Synchrony.THREAD_STACK_BYTES).start()
    }

    private fun run(source: String, promise: Promise) {
        val synchronyScript = try {
            scripts.get()
        } catch (error: Throwable) {
            Log.e("Deobfuscator", "Failed to fetch script: ${error.message}", error)
            // Same codes as iOS: ParseError for an unexpected script format, else NetworkError (no
            // connection, an HTTP error, or a download without the pinned SHA-256).
            promise.reject((error as? SynchronyFormatException)?.code ?: "NetworkError", error.message, error)
            return
        }

        try {
            val result = Synchrony.deobfuscate(synchronyScript, source)

            // Like iOS, resolve only with a string.
            if (result is String) {
                promise.resolve(result)
            } else {
                promise.reject("EvaluationError", "Deobfuscator did not return a string")
            }
        } catch (e: Throwable) {
            // A JS exception, or the engine failing to load: reject rather than crash the app.
            Log.e("Deobfuscator", "Deobfuscation failed: ${e.message}", e)
            promise.reject("EvaluationError", e.message ?: e.toString(), e)
        }
    }

    companion object {
        /** The directory under the app's cache directory the verified script is saved in. */
        const val CACHE_DIR = "consumet"

        @Volatile private var cache: SynchronyScriptCache? = null

        /**
         * One cache per process, shared by every module instance (a React reload creates new ones),
         * saving to the app's cache directory.
         */
        private fun scriptCache(context: Context): SynchronyScriptCache =
            cache ?: synchronized(this) {
                cache ?: SynchronyScriptCache(
                    File(context.applicationContext.cacheDir, CACHE_DIR),
                    download = ::downloadScript,
                ).also { cache = it }
            }

        /** Downloads [Synchrony.SCRIPT_URL]. SynchronyScriptCache checks its SHA-256. */
        fun downloadScript(): ByteArray {
            val request = Request.Builder()
                .url(Synchrony.SCRIPT_URL)
                .addHeader("User-Agent", "Mozilla/5.0 (Android)")
                .build()
            HttpClients.synchrony.newCall(request).execute().use { response ->
                if (!response.isSuccessful) throw IOException("HTTP ${response.code}: ${response.message}")
                return response.body?.bytes() ?: throw IOException("Empty body")
            }
        }
    }
}
