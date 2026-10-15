package com.consumet

import android.util.Log
import app.cash.quickjs.QuickJs
import com.facebook.react.bridge.*
import okhttp3.*
import java.io.IOException

class DeobfuscatorModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Deobfuscator"

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    @ReactMethod
    fun deobfuscateScript(source: String, promise: Promise) {
        fetchSynchronyScript { synchronyScript, error ->
            if (error != null) {
                Log.e("Deobfuscator", "Failed to fetch script: ${error.message}", error)
                // Same codes as iOS: ParseError for an unexpected script format, else NetworkError.
                promise.reject((error as? SynchronyFormatException)?.code ?: "NetworkError", error.message, error)
                return@fetchSynchronyScript
            }

            try {
                val result = QuickJs.create().use { engine ->
                    engine.evaluate("globalThis.console = { log: () => {}, warn: () => {}, error: () => {}, trace: () => {} };")
                    engine.evaluate(synchronyScript!!)

                    engine.set("sourceValue", SourceWrapper::class.java, object : SourceWrapper {
                        override fun get(): String = source
                    })

                    // Evaluate and return the result
                    engine.evaluate("new Deobfuscator().deobfuscateSource(sourceValue.get())") as? String
                }

                // Like iOS, resolve only with a string.
                if (result == null) {
                    promise.reject("EvaluationError", "Deobfuscator did not return a string")
                } else {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e("Deobfuscator", "Deobfuscation failed: ${e.message}", e)
                promise.reject("EvaluationError", e.message, e)
            }
        }
    }

    private fun fetchSynchronyScript(callback: (String?, Exception?) -> Unit) {
        val url = "https://raw.githubusercontent.com/Kohi-den/extensions-source/9328d12fcfca686becfb3068e9d0be95552c536f/lib/synchrony/src/main/assets/synchrony-v2.4.5.1.js"

        val request = Request.Builder()
            .url(url)
            .addHeader("User-Agent", "Mozilla/5.0 (Android)")
            .build()

        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (!response.isSuccessful) {
                        callback(null, IOException("HTTP ${response.code}: ${response.message}"))
                        return
                    }

                    val originalScript = response.body?.string() ?: throw IOException("Empty body")

                    val regex = Regex("""export\{(.*?) as Deobfuscator,(.*?) as Transformer\};""")
                    val transformedScript = regex.find(originalScript)?.let { match ->
                        val (deob, trans) = match.destructured
                        val replacement = "const Deobfuscator = $deob, Transformer = $trans;"
                        originalScript.replace(match.value, replacement)
                    } ?: throw SynchronyFormatException("Could not parse Synchrony export format")

                    callback(transformedScript, null)
                } catch (e: Exception) {
                    callback(null, e)
                } finally {
                    response.close()
                }
            }
        })
    }

    interface SourceWrapper {
        fun get(): String
    }

    private class SynchronyFormatException(message: String) : IOException(message) {
        val code = "ParseError"
    }
}