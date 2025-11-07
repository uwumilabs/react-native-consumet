package com.consumet

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONTokener
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import java.util.concurrent.TimeUnit

/**
 * Helper class for making HTTP requests using WebView.
 * This provides a way to make requests with full browser-like behavior,
 * including JavaScript execution and cookie management.
 */
class HttpRequestModule(private val reactContext: ReactApplicationContext) {
    private val TAG = "HttpRequestModule"

    /**
     * Makes a GET request using WebView with the ability to set custom headers.
     * This is useful when you need to execute JavaScript or handle complex cookie scenarios.
     *
     * @param url The URL to request
     * @param headers Optional headers to include in the request (ReadableMap)
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makeGetRequestWithWebView(url: String, headers: ReadableMap?, promise: Promise) {
        Log.d(TAG, "makeGetRequestWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(reactContext)
            
            // Enable WebView debugging during development
            WebView.setWebContentsDebuggingEnabled(true)
            
            // Configure WebView settings to mimic a browser
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                userAgentString = headers?.getString("User-Agent") ?: 
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }
            Log.d(TAG, "User-Agent: ${webView.settings.userAgentString}")
            
            // Enable cookies
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)
            
            // Set up timeout handler
            val timeoutHandler = Handler(Looper.getMainLooper())
            val timeoutRunnable = Runnable {
                Log.d(TAG, "Timeout in makeGetRequestWithWebView for url: $url")
                val allCookies = cookieManager.getCookie(url) ?: ""
                
                val result = WritableNativeMap()
                result.putString("url", webView.url ?: url)
                result.putString("cookies", allCookies)
                result.putString("status", "timeout")
                
                promise.resolve(result)
                webView.destroy()
            }
            
            // Log console messages for debugging
            webView.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                    Log.d(TAG, "WebView Console: ${consoleMessage.message()}")
                    return true
                }
            }
            
            // Handle page loading events
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, loadedUrl: String) {
                    Log.d(TAG, "onPageFinished for url: $loadedUrl")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    
                    // Capture page content after a short delay to ensure JS execution
                    timeoutHandler.postDelayed({
                        view.evaluateJavascript(
                            """
                            (function() {
                                try {
                                    return document.documentElement.outerHTML;
                                } catch(e) {
                                    return '';
                                }
                            })();
                            """.trimIndent()
                        ) { htmlResponse: String? ->
                            val cookies = cookieManager.getCookie(loadedUrl) ?: ""
                            Log.d(TAG, "onPageFinished cookies: $cookies")
                            
                            // The response from evaluateJavascript comes as a JSON-encoded string
                            // We need to decode it to get the actual HTML
                            val htmlContent = if (htmlResponse != null && htmlResponse != "null") {
                                try {
                                    // Remove surrounding quotes and unescape the string
                                    org.json.JSONTokener(htmlResponse).nextValue() as? String ?: htmlResponse
                                } catch (e: Exception) {
                                    Log.e(TAG, "Error parsing HTML response: ${e.message}")
                                    htmlResponse
                                }
                            } else {
                                ""
                            }
                            
                            val result = WritableNativeMap()
                            result.putString("url", loadedUrl)
                            result.putString("html", htmlContent)
                            result.putString("cookies", cookies)
                            result.putString("status", "success")
                            
                            promise.resolve(result)
                            webView.destroy()
                        }
                    }, 1500)
                }
                
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    Log.e(TAG, "onReceivedError: ${error.description}")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    promise.reject("WEBVIEW_ERROR", "WebView error: ${error.description}")
                    webView.destroy()
                }
            }
            
            // Set maximum timeout (30 seconds)
            timeoutHandler.postDelayed(timeoutRunnable, 30000)
            
            // Process headers and make request
            val headerMap = mutableMapOf<String, String>()
            
            headers?.let { headersMap ->
                val iterator = headersMap.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    val value = headersMap.getString(key) ?: ""
                    
                    if (key.equals("Cookie", ignoreCase = true)) {
                        // Set cookies in CookieManager
                        Log.d(TAG, "Setting cookies from headers: $value")
                        val cookiePairs = value.split(";")
                        for (cookie in cookiePairs) {
                            cookieManager.setCookie(url, cookie.trim())
                        }
                    } else {
                        headerMap[key] = value
                    }
                }
            }
            
            Log.d(TAG, "Loading url with headers: $headerMap")
            if (headerMap.isNotEmpty()) {
                webView.loadUrl(url, headerMap)
            } else {
                webView.loadUrl(url)
            }
        }
    }

    /**
     * Makes a POST request using WebView with the ability to set custom headers and body.
     * The response can be any content type (HTML, JSON, XML, etc.).
     *
     * @param url The URL to request
     * @param headers Optional headers to include in the request (ReadableMap)
     * @param body The POST body content
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makePostRequestWithWebView(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequestWithWebView called with url: $url")
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(reactContext)
            
            // Enable WebView debugging
            WebView.setWebContentsDebuggingEnabled(true)
            
            // Configure WebView settings
            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                loadWithOverviewMode = true
                useWideViewPort = true
                userAgentString = headers?.getString("User-Agent") ?: 
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }
            
            // Enable cookies
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)
            
            // Set up timeout handler
            val timeoutHandler = Handler(Looper.getMainLooper())
            val timeoutRunnable = Runnable {
                Log.d(TAG, "Timeout in makePostRequestWithWebView for url: $url")
                val allCookies = cookieManager.getCookie(url) ?: ""
                
                val result = WritableNativeMap()
                result.putString("url", webView.url ?: url)
                result.putString("response", "")
                result.putString("cookies", allCookies)
                result.putString("status", "timeout")
                result.putString("contentType", "unknown")
                
                promise.resolve(result)
                webView.destroy()
            }
            
            // Log console messages
            webView.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                    Log.d(TAG, "WebView Console: ${consoleMessage.message()}")
                    return true
                }
            }
            
            // Handle page loading events
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, loadedUrl: String) {
                    Log.d(TAG, "onPageFinished for url: $loadedUrl")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    
                    // Capture page content
                    timeoutHandler.postDelayed({
                        view.evaluateJavascript(
                            """
                            (function() {
                                try {
                                    // Try to detect content type from response
                                    var contentType = 'text/html';
                                    var content = document.documentElement.outerHTML;
                                    
                                    // Check if it's JSON
                                    if (document.body && document.body.children.length === 1 && 
                                        document.body.children[0].tagName === 'PRE') {
                                        var text = document.body.children[0].textContent;
                                        try {
                                            JSON.parse(text);
                                            contentType = 'application/json';
                                            content = text;
                                        } catch(e) {}
                                    }
                                    
                                    return JSON.stringify({
                                        content: content,
                                        contentType: contentType
                                    });
                                } catch(e) {
                                    return JSON.stringify({
                                        content: '',
                                        contentType: 'unknown',
                                        error: e.message
                                    });
                                }
                            })();
                            """.trimIndent()
                        ) { responseJson: String? ->
                            val cookies = cookieManager.getCookie(loadedUrl) ?: ""
                            Log.d(TAG, "onPageFinished cookies: $cookies")
                            
                            try {
                                val jsonResponse = if (responseJson != null && responseJson != "null") {
                                    JSONTokener(responseJson).nextValue() as? String ?: responseJson
                                } else {
                                    "{}"
                                }
                                
                                val json = org.json.JSONObject(jsonResponse)
                                val content = json.optString("content", "")
                                val contentType = json.optString("contentType", "text/html")
                                
                                val result = WritableNativeMap()
                                result.putString("url", loadedUrl)
                                result.putString("response", content)
                                result.putString("cookies", cookies)
                                result.putString("status", "success")
                                result.putString("contentType", contentType)
                                
                                promise.resolve(result)
                            } catch (e: Exception) {
                                Log.e(TAG, "Error parsing response: ${e.message}")
                                promise.reject("PARSE_ERROR", "Error parsing response: ${e.message}")
                            }
                            
                            webView.destroy()
                        }
                    }, 1500)
                }
                
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    Log.e(TAG, "onReceivedError: ${error.description}")
                    timeoutHandler.removeCallbacks(timeoutRunnable)
                    promise.reject("WEBVIEW_ERROR", "WebView error: ${error.description}")
                    webView.destroy()
                }
            }
            
            // Set timeout (30 seconds)
            timeoutHandler.postDelayed(timeoutRunnable, 30000)
            
            // Process headers
            val headerMap = mutableMapOf<String, String>()
            
            headers?.let { headersMap ->
                val iterator = headersMap.keySetIterator()
                while (iterator.hasNextKey()) {
                    val key = iterator.nextKey()
                    val value = headersMap.getString(key) ?: ""
                    
                    if (key.equals("Cookie", ignoreCase = true)) {
                        Log.d(TAG, "Setting cookies from headers: $value")
                        val cookiePairs = value.split(";")
                        for (cookie in cookiePairs) {
                            cookieManager.setCookie(url, cookie.trim())
                        }
                    } else {
                        headerMap[key] = value
                    }
                }
            }
            
            // Make POST request using postUrl
            Log.d(TAG, "Making POST request to: $url with body length: ${body.length}")
            webView.postUrl(url, body.toByteArray(Charsets.UTF_8))
        }
    }

    /**
     * Makes a POST request using OkHttp client (not WebView).
     * This is faster and more efficient for API calls.
     *
     * @param url The URL to request
     * @param headers Headers to include in the request (ReadableMap)
     * @param body The POST body content
     * @param promise Promise to resolve with response data or reject on error
     */
    fun makePostRequest(url: String, headers: ReadableMap?, body: String, promise: Promise) {
        Log.d(TAG, "makePostRequest called with url: $url")
        
        Thread {
            try {
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                
                // Build request body
                val mediaType = headers?.getString("Content-Type")?.let { 
                    it.toMediaType()
                } ?: "application/json; charset=utf-8".toMediaType()
                
                val requestBody = body.toRequestBody(mediaType)
                
                // Build headers
                val requestBuilder = okhttp3.Request.Builder()
                    .url(url)
                    .post(requestBody)
                
                headers?.let { headersMap ->
                    val iterator = headersMap.keySetIterator()
                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        val value = headersMap.getString(key) ?: ""
                        requestBuilder.addHeader(key, value)
                    }
                }
                
                val request = requestBuilder.build()
                
                // Execute request
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string() ?: ""
                
                // Build response headers map
                val responseHeaders = WritableNativeMap()
                response.headers.names().forEach { name ->
                    responseHeaders.putString(name, response.header(name))
                }
                
                // Build result
                val result = WritableNativeMap()
                result.putInt("statusCode", response.code)
                result.putString("body", responseBody)
                result.putMap("headers", responseHeaders)
                
                Log.d(TAG, "POST request completed with status: ${response.code}")
                promise.resolve(result)
                
                response.close()
            } catch (e: Exception) {
                Log.e(TAG, "Error making POST request: ${e.message}")
                promise.reject("HTTP_ERROR", "Error making POST request: ${e.message}")
            }
        }.start()
    }
}

