package com.consumet

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import java.io.Closeable
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/** Records how a module settles its promise. */
class TestPromise : Promise {
    private val latch = CountDownLatch(1)
    private val settles = AtomicInteger()

    @Volatile var value: Any? = null
        private set
    @Volatile var code: String? = null
        private set
    @Volatile var message: String? = null
        private set

    val settleCount: Int get() = settles.get()

    fun await(seconds: Long) {
        check(latch.await(seconds, TimeUnit.SECONDS)) { "promise did not settle within ${seconds}s" }
    }

    override fun resolve(value: Any?) {
        if (settles.getAndIncrement() == 0) this.value = value
        latch.countDown()
    }

    override fun reject(code: String?, message: String?) {
        if (settles.getAndIncrement() == 0) {
            this.code = code
            this.message = message
        }
        latch.countDown()
    }

    override fun reject(code: String?, throwable: Throwable?) = reject(code, throwable?.message)
    override fun reject(code: String?, message: String?, throwable: Throwable?) = reject(code, message)
    override fun reject(throwable: Throwable) = reject(null, throwable.message)
    override fun reject(throwable: Throwable, userInfo: WritableMap) = reject(null, throwable.message)
    override fun reject(code: String?, userInfo: WritableMap) = reject(code, null as String?)
    override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) = reject(code, throwable?.message)
    override fun reject(code: String?, message: String?, userInfo: WritableMap) = reject(code, message)
    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) =
        reject(code, message)

    @Deprecated("Use reject(code, message)")
    override fun reject(message: String) = reject(null, message)
}

/**
 * Plain-HTTP server on 127.0.0.1 for WebView tests. Serves [pages] (path to HTML body), never
 * answers `/hang` and returns 404 for anything else.
 */
class LocalHttpServer(private val pages: Map<String, String>) : Closeable {
    private val socket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
    private val hanging = Collections.synchronizedList(mutableListOf<Socket>())

    init {
        Thread {
            while (!socket.isClosed) {
                val client = try {
                    socket.accept()
                } catch (e: Exception) {
                    break
                }
                Thread { serve(client) }.start()
            }
        }.start()
    }

    fun url(path: String) = "http://127.0.0.1:${socket.localPort}$path"

    private fun serve(client: Socket) {
        try {
            val reader = client.getInputStream().bufferedReader()
            val requestLine = reader.readLine() ?: return client.close()
            // Read the headers so closing the socket does not reset the connection.
            while (reader.readLine()?.isNotEmpty() == true) Unit
            val path = requestLine.split(" ").getOrNull(1)?.substringBefore("?") ?: "/"
            if (path == "/hang") {
                hanging.add(client)
                return
            }
            val body = pages[path]
            val html = "<!DOCTYPE html><html><head><title>t</title></head><body>${body ?: "not found"}</body></html>"
            val bytes = html.toByteArray(Charsets.UTF_8)
            val status = if (body != null) "200 OK" else "404 Not Found"
            client.getOutputStream().apply {
                write(
                    ("HTTP/1.1 $status\r\nContent-Type: text/html; charset=utf-8\r\n" +
                        "Content-Length: ${bytes.size}\r\nConnection: close\r\n\r\n").toByteArray()
                )
                write(bytes)
                flush()
            }
            client.close()
        } catch (e: Exception) {
            client.close()
        }
    }

    override fun close() {
        socket.close()
        synchronized(hanging) { hanging.forEach { it.close() } }
    }
}
