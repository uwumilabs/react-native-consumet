package com.consumet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RequestHeadersTest {
    @Test
    fun userAgentAndCookieAreAppliedSeparatelyFromWebViewRequestHeaders() {
        val headers = RequestHeaders(
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
            headers.webViewExtra
        )
    }

    @Test
    fun missingHeadersAreNull() {
        val headers = RequestHeaders(mapOf("Accept" to "application/json"))

        assertNull(headers.userAgent)
        assertNull(headers.cookie)
        assertNull(headers.contentType)
        assertEquals(mapOf("Accept" to "application/json"), headers.webViewExtra)
    }

    @Test
    fun contentTypeIsFoundInAnyCase() {
        val headers = RequestHeaders(mapOf("content-type" to "application/x-www-form-urlencoded"))

        assertEquals("application/x-www-form-urlencoded", headers.contentType)
        assertEquals(headers.all, headers.webViewExtra)
    }
}
