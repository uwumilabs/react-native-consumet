package com.consumet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WebViewHeadersTest {
    @Test
    fun userAgentAndCookieAreAppliedSeparatelyFromRequestHeaders() {
        val headers = WebViewHeaders.split(
            linkedMapOf(
                "user-agent" to "test-agent",
                "Referer" to "https://example.com/",
                "COOKIE" to "a=1; b=2",
                "X-Requested-With" to "XMLHttpRequest",
            )
        )

        assertEquals("test-agent", headers.userAgent)
        assertEquals("a=1; b=2", headers.cookie)
        assertEquals(
            linkedMapOf("Referer" to "https://example.com/", "X-Requested-With" to "XMLHttpRequest"),
            headers.extra
        )
    }

    @Test
    fun missingUserAgentAndCookieAreNull() {
        val headers = WebViewHeaders.split(mapOf("Accept" to "application/json"))

        assertNull(headers.userAgent)
        assertNull(headers.cookie)
        assertEquals(mapOf("Accept" to "application/json"), headers.extra)
    }
}
