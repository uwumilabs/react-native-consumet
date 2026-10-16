package com.consumet

import com.whl.quickjs.android.QuickJSLoader
import com.whl.quickjs.wrapper.QuickJSContext
import java.io.IOException

/**
 * Runs the Synchrony deobfuscator in QuickJS, through wang.harlon.quickjs:wrapper-android. Its
 * libquickjs-android-wrapper.so is built with 16 KB ELF segment alignment, which Google Play
 * requires for apps targeting Android 15+ (app.cash.quickjs:quickjs-android 0.9.2, used before,
 * shipped a 4 KB-aligned libquickjs.so).
 */
internal object Synchrony {
    // Synchrony v2.4.5.1, at a fixed commit. The URL never serves other content, so the script must
    // have this SHA-256; anything else was tampered with or cut short (SynchronyScriptCache checks).
    // Change both together, and the ios/RCConsumetSynchronyCache.m pair with them.
    const val SCRIPT_URL =
        "https://raw.githubusercontent.com/Kohi-den/extensions-source/9328d12fcfca686becfb3068e9d0be95552c536f/lib/synchrony/src/main/assets/synchrony-v2.4.5.1.js"
    const val SCRIPT_SHA256 = "8f816ca971ca5e6a34952775f3ca1a3a7379ffe5645efd7b693574ec77358d82"

    // Synchrony walks the syntax tree recursively. It runs on its own thread with this much stack,
    // and QuickJS stops with a RangeError well before the thread's stack runs out.
    const val THREAD_STACK_BYTES = 8L * 1024 * 1024
    private const val JS_STACK_BYTES = 4 * 1024 * 1024

    private val EXPORT = Regex("""export\{(.*?) as Deobfuscator,(.*?) as Transformer\};""")
    private val engine by lazy { QuickJSLoader.init() }

    /** Rewrites Synchrony's ES module export as plain declarations, so it runs as a classic script. */
    fun prepare(original: String): String {
        val match = EXPORT.find(original) ?: throw SynchronyFormatException("Could not parse Synchrony export format")
        val (deob, trans) = match.destructured
        return original.replace(match.value, "const Deobfuscator = $deob, Transformer = $trans;")
    }

    /**
     * Runs [script] (from [prepare]) in a fresh QuickJS context and returns what
     * `new Deobfuscator().deobfuscateSource(source)` evaluates to. Throws when Synchrony throws.
     * The context lives and dies on the calling thread.
     */
    fun deobfuscate(script: String, source: String): Any? {
        engine
        val context = QuickJSContext.create()
        try {
            context.setMaxStackSize(JS_STACK_BYTES)
            context.evaluate("globalThis.console = { log: () => {}, warn: () => {}, error: () => {}, trace: () => {} };")
            context.evaluate(script, "synchrony.js")
            context.getGlobalObject().setProperty("__consumetSource", source)
            return context.evaluate("new Deobfuscator().deobfuscateSource(globalThis.__consumetSource)", "deobfuscate.js")
        } finally {
            context.destroy()
        }
    }
}

/** The downloaded Synchrony script did not have the expected format. */
internal class SynchronyFormatException(message: String) : IOException(message) {
    val code = "ParseError"
}

/**
 * The downloaded Synchrony script does not have the pinned SHA-256: it was tampered with, cut
 * short, or is another page (a captive portal's, say). deobfuscateScript rejects with NetworkError.
 */
internal class SynchronyIntegrityException(message: String) : IOException(message)
