package com.consumet

import com.facebook.react.bridge.ReadableMap

/**
 * Headers passed to a request, with the ones the requests treat specially found by name,
 * case-insensitively (as on iOS). A WebView applies them split: User-Agent goes to the WebView
 * settings, Cookie values go into the cookie store before loading (a WebView ignores a raw Cookie
 * header), and the rest ([webViewExtra]) is sent with the request.
 */
internal class RequestHeaders(val all: Map<String, String>) {
    val userAgent: String? get() = named(USER_AGENT)
    val cookie: String? get() = named(COOKIE)
    val contentType: String? get() = named("Content-Type")

    /** The headers a WebView sends with the request: all but User-Agent and Cookie. */
    val webViewExtra: Map<String, String>
        get() = all.filterKeys { !it.equals(USER_AGENT, ignoreCase = true) && !it.equals(COOKIE, ignoreCase = true) }

    private fun named(name: String): String? =
        all.entries.lastOrNull { it.key.equals(name, ignoreCase = true) }?.value

    companion object {
        private const val USER_AGENT = "User-Agent"
        private const val COOKIE = "Cookie"

        fun from(headers: ReadableMap?): RequestHeaders {
            val map = LinkedHashMap<String, String>()
            headers?.let {
                val iterator = it.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    map[key] = it.getString(key) ?: ""
                }
            }
            return RequestHeaders(map)
        }
    }
}
