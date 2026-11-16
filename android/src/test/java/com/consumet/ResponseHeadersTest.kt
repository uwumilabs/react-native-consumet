package com.consumet

import okhttp3.Headers.Companion.headersOf
import org.junit.Assert.assertEquals
import org.junit.Test

class ResponseHeadersTest {
    @Test
    fun repeatedHeadersAreJoinedAsOnIos() {
        val headers = headersOf(
            "Set-Cookie", "a=1; Path=/",
            "Content-Type", "application/json",
            "set-cookie", "b=2",
        )

        assertEquals(
            mapOf("Content-Type" to "application/json", "Set-Cookie" to "a=1; Path=/, b=2"),
            HttpRequestModule.joinedHeaders(headers)
        )
    }
}
