package com.consumet

import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/** NAT-3: the Synchrony script is downloaded once, checked against its SHA-256 and saved. */
class SynchronyScriptCacheTest {
    private val script = "class Hf{}const me=1;export{Hf as Deobfuscator,me as Transformer};".toByteArray()
    private val prepared = "class Hf{}const me=1;const Deobfuscator = Hf, Transformer = me;"
    private val sha256 = sha256Hex(script)
    private val dir: File = Files.createTempDirectory("synchrony-cache").toFile()
    private val downloads = AtomicInteger()

    @After
    fun tearDown() {
        dir.deleteRecursively()
    }

    private fun cache(cacheDir: File? = dir, serve: () -> ByteArray = { script }) =
        SynchronyScriptCache(cacheDir, sha256) {
            downloads.incrementAndGet()
            serve()
        }

    @Test
    fun hashesLikeSha256sum() {
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", sha256Hex(ByteArray(0)))
        assertTrue(Regex("[0-9a-f]{64}").matches(Synchrony.SCRIPT_SHA256))
    }

    @Test
    fun downloadsOnceAcrossCalls() {
        val cache = cache(cacheDir = null)

        repeat(3) { assertEquals(prepared, cache.get()) }

        assertEquals(1, downloads.get())
    }

    @Test
    fun concurrentFirstCallsShareOneDownload() {
        val release = CountDownLatch(1)
        val cache = cache {
            release.await(10, TimeUnit.SECONDS)
            script
        }
        val pool = Executors.newFixedThreadPool(8)
        try {
            val results = (1..8).map { pool.submit<String> { cache.get() } }
            Thread.sleep(200) // let every caller reach the cache before the download finishes
            release.countDown()

            for (result in results) assertEquals(prepared, result.get(10, TimeUnit.SECONDS))
        } finally {
            pool.shutdownNow()
        }
        assertEquals(1, downloads.get())
    }

    @Test
    fun savesTheVerifiedScriptForTheNextProcess() {
        cache().get()
        val saved = File(dir, "synchrony-$sha256.js")
        assertArrayEquals(script, saved.readBytes())

        // A new cache (a new process) reads the file instead of the network.
        val next = cache { throw IOException("offline") }
        assertEquals(prepared, next.get())
        assertEquals(1, downloads.get())
        assertEquals(saved, next.file)
    }

    @Test
    fun rejectsADownloadWithTheWrongHash() {
        val tampered = "export{evil as Deobfuscator,x as Transformer};".toByteArray()
        val cache = cache { tampered }

        val error = assertThrows(SynchronyIntegrityException::class.java) { cache.get() }

        // An IOException but not a SynchronyFormatException: deobfuscateScript rejects with NetworkError.
        assertTrue(error.message!!, error.message!!.contains("expected SHA-256 $sha256, got ${sha256Hex(tampered)}"))
        assertTrue("nothing saved", dir.listFiles()!!.isEmpty())
    }

    @Test
    fun doesNotCacheFailures() {
        val responses = ArrayDeque<() -> ByteArray>(
            listOf({ throw IOException("offline") }, { "tampered".toByteArray() }, { script })
        )
        val cache = cache { responses.removeFirst()() }

        assertThrows(IOException::class.java) { cache.get() }
        assertThrows(SynchronyIntegrityException::class.java) { cache.get() }
        assertEquals(prepared, cache.get())
        assertEquals(prepared, cache.get())
        assertEquals(3, downloads.get())
    }

    @Test
    fun replacesASavedFileThatWasTamperedWith() {
        val saved = File(dir, "synchrony-$sha256.js")
        saved.writeText("export{evil as Deobfuscator,x as Transformer};")

        assertEquals(prepared, cache().get())

        assertEquals(1, downloads.get())
        assertArrayEquals(script, saved.readBytes())
    }

    @Test
    fun deletesTheFilesOfOtherVersionsWhenSaving() {
        val old = File(dir, "synchrony-${"0".repeat(64)}.js").apply { writeText("old version") }
        val unrelated = File(dir, "other.txt").apply { writeText("keep") }

        cache().get()

        assertFalse(old.exists())
        assertTrue(unrelated.exists())
        assertEquals(setOf("synchrony-$sha256.js", "other.txt"), dir.list()!!.toSet())
    }

    @Test
    fun anUnexpectedFormatIsAParseError() {
        val other = "export default class Deobfuscator {}".toByteArray()
        val cache = SynchronyScriptCache(dir, sha256Hex(other)) { other }

        val error = assertThrows(SynchronyFormatException::class.java) { cache.get() }

        assertEquals("ParseError", error.code)
        assertTrue("nothing saved", dir.listFiles()!!.isEmpty())
    }

    @Test
    fun worksWhenTheCacheDirectoryCannotBeWritten() {
        val notADirectory = File(dir, "file").apply { writeText("x") }
        val cache = cache(cacheDir = notADirectory)

        assertEquals(prepared, cache.get())
        assertEquals(prepared, cache.get())
        assertEquals(1, downloads.get())
    }
}
