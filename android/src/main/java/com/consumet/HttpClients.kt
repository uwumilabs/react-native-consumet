package com.consumet

import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit.SECONDS

/**
 * The module's OkHttp clients. They share one connection pool and dispatcher (`newBuilder` keeps
 * them) and differ only in their timeouts.
 */
internal object HttpClients {
    private val shared = OkHttpClient()

    /** makePostRequest: 30 s to connect, and 30 s for each read and write. */
    val post: OkHttpClient = shared.newBuilder()
        .connectTimeout(30, SECONDS)
        .readTimeout(30, SECONDS)
        .writeTimeout(30, SECONDS)
        .build()

    /** The Synchrony download: 10 s to connect, 15 s for each read, 30 s in all. */
    val synchrony: OkHttpClient = shared.newBuilder()
        .connectTimeout(10, SECONDS)
        .readTimeout(15, SECONDS)
        .callTimeout(30, SECONDS)
        .build()
}
