package com.consumet

import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.Callable
import java.util.concurrent.ExecutionException
import java.util.concurrent.FutureTask

/**
 * The Synchrony script for deobfuscateScript, so it is not downloaded on every call (NAT-3).
 *
 * - Memory: once loaded, the prepared script ([Synchrony.prepare]) is kept for the life of the
 *   object (DeobfuscatorModule keeps one per process). Callers that arrive while it is loading
 *   wait for that load instead of starting their own.
 * - Disk: a verified download is saved as `synchrony-<sha256>.js` in [dir], so later processes
 *   skip the network. The file is hashed again when read; if it doesn't match it is deleted and
 *   the script downloaded again. Saving is best-effort, and the OS may clear [dir] at any time.
 * - Integrity: the script must have the SHA-256 [sha256]. A download that doesn't is rejected
 *   with [SynchronyIntegrityException] and never saved.
 *
 * Failures are not cached: the next call tries again. Pinning a new script version (a new
 * [sha256]) uses a new file name, and saving it deletes the files of other versions.
 */
internal class SynchronyScriptCache(
    private val dir: File?,
    private val sha256: String = Synchrony.SCRIPT_SHA256,
    private val download: () -> ByteArray,
) {
    @Volatile private var script: String? = null
    private var loading: FutureTask<String>? = null
    private val lock = Any()

    /** Where the verified script is saved, or null without a cache directory. */
    val file: File? get() = dir?.let { File(it, "synchrony-$sha256.js") }

    /**
     * The prepared script. Blocks while it is read from disk or downloaded. Throws an
     * [IOException]: [SynchronyIntegrityException] for a download with the wrong SHA-256,
     * [SynchronyFormatException] for an unexpected script format, or a network error.
     */
    fun get(): String {
        script?.let { return it }
        var owner = false
        val task = synchronized(lock) {
            script?.let { return it }
            loading ?: FutureTask(Callable { load() }).also {
                loading = it
                owner = true
            }
        }
        if (owner) {
            try {
                task.run()
            } finally {
                synchronized(lock) { loading = null }
            }
        }
        return try {
            task.get()
        } catch (e: ExecutionException) {
            throw e.cause ?: e
        }
    }

    private fun load(): String {
        readSaved()?.let { return use(it) }
        val bytes = download()
        verify(bytes)
        return use(bytes).also { save(bytes) }
    }

    private fun use(bytes: ByteArray): String =
        Synchrony.prepare(String(bytes, Charsets.UTF_8)).also { script = it }

    private fun verify(bytes: ByteArray) {
        val actual = sha256Hex(bytes)
        if (actual != sha256) {
            throw SynchronyIntegrityException(
                "Synchrony script failed its integrity check: expected SHA-256 $sha256, got $actual"
            )
        }
    }

    /** The saved script if it is intact; a file that isn't is deleted. */
    private fun readSaved(): ByteArray? {
        val file = file?.takeIf { it.isFile } ?: return null
        val bytes = try {
            file.readBytes()
        } catch (e: IOException) {
            return null
        }
        if (sha256Hex(bytes) == sha256) return bytes
        file.delete()
        return null
    }

    private fun save(bytes: ByteArray) {
        val dir = dir ?: return
        val target = file ?: return
        var temp: File? = null
        try {
            dir.mkdirs()
            // Write a temporary file and rename it, so no reader sees a partial script.
            temp = File.createTempFile(".synchrony", ".tmp", dir).apply { writeBytes(bytes) }
            if (!temp.renameTo(target)) return
            dir.listFiles { f -> SAVED_NAME.matches(f.name) && f.name != target.name }?.forEach { it.delete() }
        } catch (e: Exception) {
            // Not saved (no space, no permission): this process still has the script in memory.
        } finally {
            temp?.takeIf { it.exists() }?.delete()
        }
    }

    private companion object {
        val SAVED_NAME = Regex("synchrony-[0-9a-f]{64}\\.js")
    }
}

internal fun sha256Hex(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
