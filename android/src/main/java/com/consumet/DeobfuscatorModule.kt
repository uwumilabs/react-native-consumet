package com.consumet

import android.util.Log
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

            Thread(null, {
                try {
                    val result = Synchrony.deobfuscate(synchronyScript!!, source)

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
            }, "ConsumetDeobfuscator", Synchrony.THREAD_STACK_BYTES).start()
        }
    }

    private fun fetchSynchronyScript(callback: (String?, Exception?) -> Unit) {
        val request = Request.Builder()
            .url(Synchrony.SCRIPT_URL)
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
                    callback(Synchrony.prepare(originalScript), null)
                } catch (e: Exception) {
                    callback(null, e)
                } finally {
                    response.close()
                }
            }
        })
    }
}
