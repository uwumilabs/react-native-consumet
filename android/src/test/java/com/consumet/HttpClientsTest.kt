package com.consumet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class HttpClientsTest {
    private val clients = listOf(HttpClients.post, HttpClients.synchrony)

    @Test
    fun shareOneConnectionPoolAndDispatcher() {
        for (client in clients) {
            assertSame(HttpClients.post.connectionPool, client.connectionPool)
            assertSame(HttpClients.post.dispatcher, client.dispatcher)
        }
    }

    @Test
    fun keepEachRequestsTimeouts() {
        // connect, read, write, call, in milliseconds (0: none)
        val timeouts = clients.map {
            listOf(it.connectTimeoutMillis, it.readTimeoutMillis, it.writeTimeoutMillis, it.callTimeoutMillis)
        }

        assertEquals(
            listOf(
                listOf(30_000, 30_000, 30_000, 0),
                listOf(10_000, 15_000, 10_000, 30_000),
            ),
            timeouts
        )
    }
}
