package com.consumet

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/**
 * Native JavaScript module executor that maintains state in WebView This allows us to load modules
 * once and call their functions multiple times
 */
class NativeModuleExecutor(private val reactContext: ReactApplicationContext) {
    private val tag = "NativeModuleExecutor"
    private val handler = Handler(Looper.getMainLooper())
    private val moduleInstances = ConcurrentHashMap<String, WebView>()
    private val executionQueue = ConcurrentHashMap<String, CountDownLatch>()
    private val executionResults = ConcurrentHashMap<String, String>()
    private val executionErrors = ConcurrentHashMap<String, String>()

    /** Load and initialize a JavaScript module in a persistent WebView */
    fun loadModule(moduleId: String, code: String, contextJson: String, promise: Promise) {
        handler.post {
            try {
                // Clean up any existing module with the same ID
                moduleInstances[moduleId]?.destroy()

                val webView = WebView(reactContext)

                // Enable JavaScript and set up WebView for module execution
                webView.settings.apply {
                    javaScriptEnabled = true
                    allowContentAccess = true
                    allowFileAccess = true
                    databaseEnabled = true
                    domStorageEnabled = true
                }

                // Enable debugging in development
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                    WebView.setWebContentsDebuggingEnabled(true)
                }

                val latch = CountDownLatch(1)
                var loadResult: String? = null
                var loadError: String? = null

                // Add JavaScript interface for module loading
                webView.addJavascriptInterface(
                        object {
                            @JavascriptInterface
                            fun onModuleLoaded(moduleInfo: String) {
                                loadResult = moduleInfo
                                latch.countDown()
                            }

                            @JavascriptInterface
                            fun onModuleError(errorMsg: String) {
                                loadError = errorMsg
                                latch.countDown()
                            }

                            @JavascriptInterface
                            fun log(message: String) {
                                Log.d(tag, "Module $moduleId Log: $message")
                            }

                            @JavascriptInterface
                            fun executeFunction(executionId: String, result: String) {
                                executionResults[executionId] = result
                                executionQueue[executionId]?.countDown()
                            }

                            @JavascriptInterface
                            fun executionError(executionId: String, error: String) {
                                executionErrors[executionId] = error
                                executionQueue[executionId]?.countDown()
                            }
                        },
                        "NativeModule"
                )

                webView.webViewClient =
                        object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)

                                // Load and initialize the module
                                val moduleSetup =
                                        """
                            (function() {
                                try {
                                    // Set up comprehensive CommonJS environment
                                    var global = window;
                                    var exports = {};
                                    var module = { exports: exports };
                                    
                                    // Define moduleMap at global scope so it can be used for context creation
                                    var moduleMap = {
                                        'axios': {
                                            get: function(url, config) {
                                                console.log('Axios GET called with:', url, config);
                                                return fetch(url, { 
                                                    method: 'GET', 
                                                    headers: config ? config.headers : {} 
                                                }).then(function(response) {
                                                    console.log('Axios GET response status:', response.status);
                                                    return response.text().then(function(text) {
                                                        return {
                                                            data: text,
                                                            status: response.status,
                                                            statusText: response.statusText,
                                                            headers: {},
                                                            config: config || {}
                                                        };
                                                    });
                                                }).catch(function(error) {
                                                    console.error('Axios GET error:', error);
                                                    throw error;
                                                });
                                            },
                                            post: function(url, data, config) {
                                                console.log('Axios POST called with:', url, data, config);
                                                return fetch(url, { 
                                                    method: 'POST', 
                                                    body: typeof data === 'string' ? data : JSON.stringify(data),
                                                    headers: config ? config.headers : { 'Content-Type': 'application/json' }
                                                }).then(function(response) {
                                                    console.log('Axios POST response status:', response.status);
                                                    return response.text().then(function(text) {
                                                        return {
                                                            data: text,
                                                            status: response.status,
                                                            statusText: response.statusText,
                                                            headers: {},
                                                            config: config || {}
                                                        };
                                                    });
                                                }).catch(function(error) {
                                                    console.error('Axios POST error:', error);
                                                    throw error;
                                                });
                                            },
                                            create: function(config) {
                                                console.log('Axios create called with config:', config);
                                                // Return an axios instance with the same interface
                                                return {
                                                    get: this.get,
                                                    post: this.post,
                                                    defaults: {
                                                        headers: config && config.headers ? config.headers : {},
                                                        timeout: config && config.timeout ? config.timeout : 15000
                                                    }
                                                };
                                            }
                                        },
                                        'cheerio': {
                                            load: function(html) {
                                                // Minimal cheerio implementation for testing
                                                return function(selector) {
                                                    return {
                                                        text: function() { return 'Mock text'; },
                                                        attr: function(name) { return 'Mock attr'; },
                                                        find: function() { return this; },
                                                        each: function(fn) { 
                                                            for(var i = 0; i < 3; i++) {
                                                                fn(i, {});
                                                            }
                                                            return this; 
                                                        }
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
                                            SubOrSub: { SUB: 'sub', DUB: 'dub', BOTH: 'both' },
                                            StreamingServers: { 
                                                VidCloud: 'vidcloud', 
                                                StreamSB: 'streamsb',
                                                StreamTape: 'streamtape',
                                                VidStreaming: 'vidstreaming'
                                            },
                                            MediaStatus: { 
                                                ONGOING: 'ongoing', 
                                                COMPLETED: 'completed',
                                                NOT_YET_AIRED: 'not_yet_aired',
                                                UNKNOWN: 'unknown'
                                            },
                                            WatchListType: { 
                                                WATCHING: 'watching', 
                                                COMPLETED: 'completed',
                                                ONHOLD: 'onhold',
                                                PLAN_TO_WATCH: 'plan_to_watch',
                                                DROPPED: 'dropped',
                                                NONE: 'none'
                                            }
                                        }
                                    };
                                    
                                    // Create require function with full module support
                                    var require = function(modulePath) {
                                        return moduleMap[modulePath] || {};
                                    };
                                    
                                    // Enhanced console for debugging
                                    var console = {
                                        log: function() {
                                            var args = Array.prototype.slice.call(arguments);
                                            NativeModule.log('LOG: ' + args.join(' '));
                                        },
                                        error: function() {
                                            var args = Array.prototype.slice.call(arguments);
                                            NativeModule.log('ERROR: ' + args.join(' '));
                                        },
                                        warn: function() {
                                            var args = Array.prototype.slice.call(arguments);
                                            NativeModule.log('WARN: ' + args.join(' '));
                                        }
                                    };
                                    
                                    // Load the module code
                                    eval(${JSONObject.quote(code)});
                                    
                                    // Store the module globally for function execution
                                    window.loadedModule = module.exports;
                                    window.providerInstances = {};
                                    
                                    // Parse and store the context for provider creation
                                    var contextData = JSON.parse(${JSONObject.quote(contextJson)});
                                    window.providerContext = {
                                        axios: moduleMap['axios'],
                                        load: moduleMap['cheerio'].load,
                                        USER_AGENT: contextData.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                        AnimeParser: moduleMap['../../models'].AnimeParser,
                                        MovieParser: moduleMap['../../models'].AnimeParser, // Use same as AnimeParser for now
                                        extractors: {}, // Empty for now, can be populated if needed
                                        logger: console
                                    };
                                    
                                    console.log('Provider context created successfully:', {
                                        hasAxios: !!window.providerContext.axios,
                                        hasLoad: !!window.providerContext.load,
                                        userAgent: window.providerContext.USER_AGENT,
                                        hasAnimeParser: !!window.providerContext.AnimeParser
                                    });
                                    
                                    // Create function executor
                                    window.executeModuleFunction = function(executionId, functionName, argsJson) {
                                        try {
                                            var args = JSON.parse(argsJson);
                                            
                                            // Check if this is a factory function (create* functions) or module export
                                            if (functionName.includes('create') || functionName === 'default' || (window.loadedModule[functionName] && typeof window.loadedModule[functionName] === 'function')) {
                                                var func = window.loadedModule[functionName];
                                                
                                                if (typeof func !== 'function') {
                                                    throw new Error('Function ' + functionName + ' not found or not a function');
                                                }
                                                
                                                // Execute the factory function with proper context
                                                // The first argument should be the context, so replace it
                                                var contextualArgs = [window.providerContext];
                                                if (args.length > 1) {
                                                    contextualArgs = contextualArgs.concat(args.slice(1));
                                                }
                                                console.log('Calling factory function with context:', {
                                                    functionName: functionName,
                                                    hasAxios: !!window.providerContext.axios,
                                                    axiosType: typeof window.providerContext.axios,
                                                    contextKeys: Object.keys(window.providerContext),
                                                    argsLength: contextualArgs.length
                                                });
                                                var result = func.apply(null, contextualArgs);
                                                
                                                // Handle promises
                                                if (result && typeof result.then === 'function') {
                                                    result.then(function(promiseResult) {
                                                        // Store the provider instance
                                                        if (promiseResult && typeof promiseResult === 'object') {
                                                            window.providerInstances.currentProvider = promiseResult;
                                                            console.log('Provider instance created:', {
                                                                type: typeof promiseResult,
                                                                keys: Object.keys(promiseResult),
                                                                ownProps: Object.getOwnPropertyNames(promiseResult),
                                                                methods: Object.getOwnPropertyNames(promiseResult).filter(function(key) {
                                                                    return typeof promiseResult[key] === 'function';
                                                                }),
                                                                protoMethods: (function() {
                                                                    var proto = Object.getPrototypeOf(promiseResult);
                                                                    return proto ? Object.getOwnPropertyNames(proto).filter(function(key) {
                                                                        return typeof proto[key] === 'function' && key !== 'constructor';
                                                                    }) : [];
                                                                })()
                                                            });
                                                        }
                                                        
                                                        NativeModule.executeFunction(executionId, JSON.stringify({
                                                            success: true,
                                                            result: promiseResult
                                                        }));
                                                    }).catch(function(promiseError) {
                                                        NativeModule.executionError(executionId, promiseError.message || 'Promise rejected');
                                                    });
                                                } else {
                                                    // Synchronous result
                                                    if (result && typeof result === 'object') {
                                                        window.providerInstances.currentProvider = result;
                                                        console.log('Provider instance created (sync):', {
                                                            type: typeof result,
                                                            keys: Object.keys(result),
                                                            ownProps: Object.getOwnPropertyNames(result),
                                                            methods: Object.getOwnPropertyNames(result).filter(function(key) {
                                                                return typeof result[key] === 'function';
                                                            }),
                                                            protoMethods: (function() {
                                                                var proto = Object.getPrototypeOf(result);
                                                                return proto ? Object.getOwnPropertyNames(proto).filter(function(key) {
                                                                    return typeof proto[key] === 'function' && key !== 'constructor';
                                                                }) : [];
                                                            })()
                                                        });
                                                    }
                                                    
                                                    NativeModule.executeFunction(executionId, JSON.stringify({
                                                        success: true,
                                                        result: result
                                                    }));
                                                }
                                            } else {
                                                // Method call on provider instance
                                                var provider = window.providerInstances.currentProvider;
                                                if (!provider) {
                                                    throw new Error('No provider instance available');
                                                }
                                                
                                                var method = provider[functionName];
                                                if (typeof method !== 'function') {
                                                    // Try to look for the method on the prototype chain
                                                    var proto = provider;
                                                    while (proto && typeof method !== 'function') {
                                                        proto = Object.getPrototypeOf(proto);
                                                        if (proto) {
                                                            method = proto[functionName];
                                                        }
                                                    }
                                                    
                                                    if (typeof method !== 'function') {
                                                        var availableMethods = [];
                                                        var currentObj = provider;
                                                        while (currentObj) {
                                                            Object.getOwnPropertyNames(currentObj).forEach(function(key) {
                                                                if (typeof currentObj[key] === 'function' && availableMethods.indexOf(key) === -1) {
                                                                    availableMethods.push(key);
                                                                }
                                                            });
                                                            currentObj = Object.getPrototypeOf(currentObj);
                                                            if (currentObj === Object.prototype) break;
                                                        }
                                                        throw new Error('Method ' + functionName + ' not found on provider instance. Available methods: ' + availableMethods.join(', '));
                                                    }
                                                }
                                                
                                                console.log('Executing method ' + functionName + ' on provider instance. Provider type:', typeof provider);
                                                console.log('Method found:', typeof method === 'function' ? 'YES' : 'NO');
                                                console.log('Args provided:', args);
                                                
                                                // Execute the method with proper error handling
                                                try {
                                                    var result = method.apply(provider, args);
                                                } catch (methodError) {
                                                    console.error('Method execution error:', methodError);
                                                    throw new Error('Method ' + functionName + ' execution failed: ' + (methodError.message || methodError));
                                                }
                                                
                                                // Handle promises
                                                if (result && typeof result.then === 'function') {
                                                    result.then(function(promiseResult) {
                                                        console.log('Method ' + functionName + ' completed successfully');
                                                        NativeModule.executeFunction(executionId, JSON.stringify({
                                                            success: true,
                                                            result: promiseResult
                                                        }));
                                                    }).catch(function(promiseError) {
                                                        console.error('Method ' + functionName + ' failed:', promiseError);
                                                        NativeModule.executionError(executionId, promiseError.message || 'Promise rejected');
                                                    });
                                                } else {
                                                    // Synchronous result
                                                    console.log('Method ' + functionName + ' completed synchronously');
                                                    NativeModule.executeFunction(executionId, JSON.stringify({
                                                        success: true,
                                                        result: result
                                                    }));
                                                }
                                            }
                                        } catch (execError) {
                                            NativeModule.executionError(executionId, execError.message);
                                        }
                                    };
                                    
                                    // Report successful module loading
                                    var moduleInfo = {
                                        success: true,
                                        moduleId: '${moduleId}',
                                        exportKeys: Object.keys(module.exports || {}),
                                        hasCreateZoro: typeof module.exports.createZoro === 'function'
                                    };
                                    
                                    NativeModule.onModuleLoaded(JSON.stringify(moduleInfo));
                                    
                                } catch (loadError) {
                                    NativeModule.onModuleError('Module loading failed: ' + loadError.message);
                                }
                            })();
                        """.trimIndent()

                                // Execute the module setup
                                webView.evaluateJavascript(moduleSetup, null)
                            }
                        }

                // Load a minimal HTML page
                val html =
                        """
                    <!DOCTYPE html>
                    <html>
                    <head><title>Module: $moduleId</title></head>
                    <body><script>// Module container ready</script></body>
                    </html>
                """.trimIndent()

                webView.loadDataWithBaseURL(
                        "file:///android_asset/",
                        html,
                        "text/html",
                        "UTF-8",
                        null
                )

                // Wait for module loading with timeout
                Thread {
                            try {
                                val completed = latch.await(30, TimeUnit.SECONDS)

                                if (!completed) {
                                    promise.reject("TIMEOUT", "Module loading timed out")
                                    return@Thread
                                }

                                when {
                                    loadError != null -> {
                                        promise.reject("MODULE_ERROR", loadError)
                                    }
                                    loadResult != null -> {
                                        // Store the WebView for future function calls
                                        moduleInstances[moduleId] = webView
                                        promise.resolve(loadResult)
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
                            }
                        }
                        .start()
            } catch (e: Exception) {
                Log.e(tag, "Error setting up module loader", e)
                promise.reject("SETUP_ERROR", "Failed to set up module loader: ${e.message}")
            }
        }
    }

    /** Execute a function in a loaded module */
    fun executeFunction(
            moduleId: String,
            functionName: String,
            argsJson: String,
            promise: Promise
    ) {
        val webView = moduleInstances[moduleId]

        if (webView == null) {
            promise.reject("MODULE_NOT_FOUND", "Module $moduleId not loaded")
            return
        }

        handler.post {
            try {
                val executionId = "${moduleId}_${System.currentTimeMillis()}"
                val latch = CountDownLatch(1)

                executionQueue[executionId] = latch

                // Execute the function in the WebView
                webView.evaluateJavascript(
                        "window.executeModuleFunction('$executionId', '$functionName', ${JSONObject.quote(argsJson)});",
                        null
                )

                // Wait for execution result
                Thread {
                            try {
                                val completed = latch.await(60, TimeUnit.SECONDS)

                                if (!completed) {
                                    promise.reject(
                                            "EXECUTION_TIMEOUT",
                                            "Function execution timed out"
                                    )
                                    return@Thread
                                }

                                val error = executionErrors.remove(executionId)
                                val result = executionResults.remove(executionId)
                                executionQueue.remove(executionId)

                                when {
                                    error != null -> {
                                        promise.reject("EXECUTION_ERROR", error)
                                    }
                                    result != null -> {
                                        promise.resolve(result)
                                    }
                                    else -> {
                                        promise.reject(
                                                "UNKNOWN_ERROR",
                                                "No execution result received"
                                        )
                                    }
                                }
                            } catch (e: Exception) {
                                promise.reject(
                                        "THREAD_ERROR",
                                        "Execution thread failed: ${e.message}"
                                )
                            }
                        }
                        .start()
            } catch (e: Exception) {
                promise.reject(
                        "EXECUTION_SETUP_ERROR",
                        "Failed to set up function execution: ${e.message}"
                )
            }
        }
    }

    /** Clean up a loaded module */
    fun unloadModule(moduleId: String) {
        handler.post {
            moduleInstances[moduleId]?.destroy()
            moduleInstances.remove(moduleId)
        }
    }

    /** Clean up all modules */
    fun cleanup() {
        handler.post {
            moduleInstances.values.forEach { it.destroy() }
            moduleInstances.clear()
            executionQueue.clear()
            executionResults.clear()
            executionErrors.clear()
        }
    }
}
