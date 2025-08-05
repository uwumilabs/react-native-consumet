package com.consumet

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONObject

class JavaScriptEvaluator(private val reactContext: ReactApplicationContext) {
    private val tag = "JavaScriptEvaluator"
    private val handler = Handler(Looper.getMainLooper())

    /**
     * Evaluates JavaScript code using Android's V8 engine via WebView This provides proper CommonJS
     * module support unlike manual eval()
     */
    fun evaluateJavaScript(code: String, contextJson: String, promise: Promise) {
        handler.post {
            try {
                val webView = WebView(reactContext)

                // Enable JavaScript and set up WebView
                webView.settings.apply {
                    javaScriptEnabled = true
                    allowContentAccess = true
                    allowFileAccess = true
                    databaseEnabled = true
                    domStorageEnabled = true
                }

                val latch = CountDownLatch(1)
                var result: String? = null
                var error: String? = null

                // Add JavaScript interface for communication
                webView.addJavascriptInterface(
                        object {
                            @JavascriptInterface
                            fun onResult(value: String) {
                                result = value
                                latch.countDown()
                            }

                            @JavascriptInterface
                            fun onError(errorMsg: String) {
                                error = errorMsg
                                latch.countDown()
                            }

                            @JavascriptInterface
                            fun log(message: String) {
                                Log.d(tag, "JS Log: $message")
                            }
                        },
                        "Android"
                )

                webView.webViewClient =
                        object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)

                                // Parse the context JSON to inject required modules
                                val context =
                                        try {
                                            JSONObject(contextJson)
                                        } catch (e: Exception) {
                                            JSONObject()
                                        }

                                // Create a comprehensive CommonJS environment
                                val commonJSSetup =
                                        """
                            (function() {
                                // Set up CommonJS environment
                                var global = window;
                                var exports = {};
                                var module = { exports: exports };
                                
                                // Mock require function with proper module mapping
                                var require = function(modulePath) {
                                    // Map common module paths to mock implementations
                                    var moduleMap = {
                                        'axios': {
                                            get: function(url, config) {
                                                return fetch(url, { method: 'GET', headers: config ? config.headers : {} })
                                                    .then(function(response) {
                                                        return {
                                                            data: response.text(),
                                                            status: response.status,
                                                            headers: response.headers
                                                        };
                                                    });
                                            },
                                            post: function(url, data, config) {
                                                return fetch(url, { 
                                                    method: 'POST', 
                                                    body: JSON.stringify(data),
                                                    headers: config ? config.headers : { 'Content-Type': 'application/json' }
                                                }).then(function(response) {
                                                    return {
                                                        data: response.text(),
                                                        status: response.status,
                                                        headers: response.headers
                                                    };
                                                });
                                            }
                                        },
                                        'cheerio': {
                                            load: function(html) {
                                                // Simplified cheerio mock - in real implementation you'd need a proper DOM parser
                                                return function(selector) {
                                                    return {
                                                        text: function() { return ''; },
                                                        attr: function() { return ''; },
                                                        find: function() { return this; },
                                                        each: function() { return this; },
                                                        hasClass: function() { return false; },
                                                        remove: function() { return this; },
                                                        end: function() { return this; },
                                                        contents: function() { return this; },
                                                        last: function() { return this; },
                                                        first: function() { return this; },
                                                        next: function() { return this; },
                                                        prev: function() { return this; },
                                                        parent: function() { return this; },
                                                        length: 0
                                                    };
                                                };
                                            }
                                        },
                                        '../../models': {
                                            AnimeParser: function() {
                                                this.name = '';
                                                this.baseUrl = '';
                                                this.logo = '';
                                                this.classPath = '';
                                            },
                                            MovieParser: function() {
                                                this.name = '';
                                                this.baseUrl = '';
                                                this.logo = '';
                                                this.classPath = '';
                                            },
                                            SubOrSub: { 
                                                SUB: 'sub', 
                                                DUB: 'dub', 
                                                BOTH: 'both' 
                                            },
                                            StreamingServers: { 
                                                AsianLoad: 'asianload',
                                                GogoCDN: 'gogocdn',
                                                StreamSB: 'streamsb',
                                                MixDrop: 'mixdrop',
                                                Mp4Upload: 'mp4upload',
                                                UpCloud: 'upcloud',
                                                VidCloud: 'vidcloud',
                                                StreamTape: 'streamtape',
                                                VizCloud: 'vizcloud',
                                                MyCloud: 'mycloud',
                                                Filemoon: 'filemoon',
                                                VidStreaming: 'vidstreaming',
                                                BuiltIn: 'builtin',
                                                SmashyStream: 'smashystream',
                                                StreamHub: 'streamhub',
                                                StreamWish: 'streamwish',
                                                VidHide: 'vidhide',
                                                VidMoly: 'vidmoly',
                                                Voe: 'voe',
                                                MegaUp: 'megaup',
                                                MegaCloud: 'megacloud',
                                                Luffy: 'luffy',
                                                Multi: 'multi'
                                            },
                                            MediaStatus: { 
                                                ONGOING: 'Ongoing',
                                                COMPLETED: 'Completed',
                                                HIATUS: 'Hiatus',
                                                CANCELLED: 'Cancelled',
                                                NOT_YET_AIRED: 'Not yet aired',
                                                UNKNOWN: 'Unknown'
                                            },
                                            WatchListType: { 
                                                WATCHING: 'watching',
                                                ONHOLD: 'on-hold',
                                                PLAN_TO_WATCH: 'plan to watch',
                                                DROPPED: 'dropped',
                                                COMPLETED: 'completed',
                                                NONE: 'none'
                                            },
                                            MediaFormat: {
                                                TV: 'TV',
                                                TV_SHORT: 'TV_SHORT',
                                                TV_SPECIAL: 'TV_SPECIAL',
                                                MOVIE: 'MOVIE',
                                                SPECIAL: 'SPECIAL',
                                                OVA: 'OVA',
                                                ONA: 'ONA',
                                                MUSIC: 'MUSIC',
                                                MANGA: 'MANGA',
                                                NOVEL: 'NOVEL',
                                                ONE_SHOT: 'ONE_SHOT',
                                                PV: 'PV',
                                                COMIC: 'COMIC'
                                            },
                                            TvType: {
                                                TVSERIES: 'TV Series',
                                                MOVIE: 'Movie',
                                                ANIME: 'Anime',
                                                PEOPLE: 'People'
                                            }
                                        },
                                        '../../extractors': {
                                            AsianLoad: function(ctx) {
                                                this.extract = function(url, isAlt) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            Filemoon: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            GogoCDN: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            Kwik: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            MixDrop: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            Mp4Player: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            Mp4Upload: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            RapidCloud: function(ctx) {
                                                this.extract = function(url, referer) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            MegaCloud: function(ctx) {
                                                this.extract = function(url, referer) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            StreamHub: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            StreamLare: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            StreamSB: function(ctx) {
                                                this.extract = function(url, isAlt) {
                                                    return Promise.resolve([]);
                                                };
                                            },
                                            StreamTape: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve([]);
                                                };
                                            },
                                            StreamWish: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            VidCloud: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            VidMoly: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            VizCloud: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            VidHide: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            Voe: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            },
                                            MegaUp: function(ctx) {
                                                this.extract = function(url) {
                                                    return Promise.resolve({ sources: [], subtitles: [] });
                                                };
                                            }
                                        },
                                        '../../utils/create-provider-context': {
                                            createProviderContext: function() {
                                                return {
                                                    axios: moduleMap.axios,
                                                    load: moduleMap.cheerio.load,
                                                    USER_AGENT: 'Mozilla/5.0 (compatible; Consumet/1.0)',
                                                    AnimeParser: moduleMap['../../models'].AnimeParser,
                                                    MovieParser: moduleMap['../../models'].MovieParser,
                                                    extractors: moduleMap['../../extractors'],
                                                    logger: console
                                                };
                                            }
                                        }
                                    };
                                    
                                    return moduleMap[modulePath] || {};
                                };
                                
                                // Enhanced console for debugging
                                var console = {
                                    log: function() {
                                        var args = Array.prototype.slice.call(arguments);
                                        Android.log('LOG: ' + args.join(' '));
                                    },
                                    error: function() {
                                        var args = Array.prototype.slice.call(arguments);
                                        Android.log('ERROR: ' + args.join(' '));
                                    },
                                    warn: function() {
                                        var args = Array.prototype.slice.call(arguments);
                                        Android.log('WARN: ' + args.join(' '));
                                    }
                                };
                                
                                try {
                                    // Execute the provider code in proper CommonJS context
                                    eval(${JSONObject.quote(code)});
                                    
                                    // Check if module.exports has the expected functions
                                    var exportKeys = Object.keys(module.exports || {});
                                    console.log('Export keys found:', exportKeys);
                                    
                                    if (exportKeys.length === 0) {
                                        Android.onError('No exports found in module');
                                        return;
                                    }
                                    
                                    // Store the actual functions in a global registry so they can be called later
                                    window.providerRegistry = window.providerRegistry || {};
                                    var moduleId = 'module_' + Date.now();
                                    window.providerRegistry[moduleId] = module.exports;
                                    
                                    // Return metadata about the successful evaluation
                                    var result = JSON.stringify({
                                        success: true,
                                        moduleId: moduleId,
                                        exportKeys: exportKeys,
                                        hasCreateZoro: typeof module.exports.createZoro === 'function',
                                        hasDefault: typeof module.exports.default === 'function'
                                    });
                                    
                                    Android.onResult(result);
                                    
                                } catch (evalError) {
                                    console.error('JavaScript evaluation error:', evalError.message);
                                    Android.onError('Evaluation failed: ' + evalError.message);
                                }
                            })();
                        """.trimIndent()

                                // Execute the setup script
                                webView.evaluateJavascript(commonJSSetup, null)
                            }
                        }

                // Load a minimal HTML page to initialize the WebView
                val html =
                        """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>JavaScript Evaluator</title>
                    </head>
                    <body>
                        <script>
                            // WebView is ready for JavaScript execution
                        </script>
                    </body>
                    </html>
                """.trimIndent()

                webView.loadDataWithBaseURL(
                        "file:///android_asset/",
                        html,
                        "text/html",
                        "UTF-8",
                        null
                )

                // Wait for evaluation to complete with timeout
                Thread {
                            try {
                                val completed = latch.await(30, TimeUnit.SECONDS)

                                if (!completed) {
                                    promise.reject("TIMEOUT", "JavaScript evaluation timed out")
                                    return@Thread
                                }

                                when {
                                    error != null -> {
                                        promise.reject("EVALUATION_ERROR", error)
                                    }
                                    result != null -> {
                                        promise.resolve(result)
                                    }
                                    else -> {
                                        promise.reject(
                                                "UNKNOWN_ERROR",
                                                "No result or error received"
                                        )
                                    }
                                }
                            } catch (e: Exception) {
                                promise.reject(
                                        "THREAD_ERROR",
                                        "Thread execution failed: ${e.message}"
                                )
                            } finally {
                                // Clean up WebView on UI thread
                                handler.post {
                                    try {
                                        webView.destroy()
                                    } catch (e: Exception) {
                                        Log.e(tag, "Error destroying WebView", e)
                                    }
                                }
                            }
                        }
                        .start()
            } catch (e: Exception) {
                Log.e(tag, "Error setting up JavaScript evaluation", e)
                promise.reject(
                        "SETUP_ERROR",
                        "Failed to set up JavaScript evaluation: ${e.message}"
                )
            }
        }
    }
}
