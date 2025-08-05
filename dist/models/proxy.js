"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Proxy = void 0;
const axios_1 = __importDefault(require("axios"));
class Proxy {
    constructor(proxyConfig, adapter) {
        this.proxyConfig = proxyConfig;
        this.adapter = adapter;
        this.validUrl = /^https?:\/\/.+/;
        this.proxyUrl = null;
        this.proxyKey = null;
        this.rotationTimer = null;
        this.rotateProxy = (proxy) => {
            // Start with first URL
            this.proxyUrl = proxy.urls[0];
            this.proxyKey = proxy.key ?? null;
            // Set up rotation
            let index = 0;
            const urlCount = proxy.urls.length;
            this.rotationTimer = setInterval(() => {
                // Move to next URL in array
                index = (index + 1) % urlCount;
                this.proxyUrl = proxy.urls[index];
            }, proxy?.rotateInterval ?? 5000);
        };
        this.toMap = (arr) => arr.map((v, i) => [i, v]);
        // Create client with optimized defaults for React Native
        axios_1.default = axios_1.default.create({
            // Increase timeout for mobile networks
            timeout: 15000,
            // Add headers only once here
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
            },
        });
        // Apply adapter if provided
        if (adapter)
            axios_1.default.defaults.adapter = adapter;
        // Set up interceptor only once
        this.setupInterceptor();
        // Apply proxy if provided
        if (proxyConfig)
            this.setProxy(proxyConfig);
    }
    setupInterceptor() {
        // Set the interceptor once during initialization
        axios_1.default.interceptors.request.use((config) => {
            // Only modify URL if we have a proxy
            if (this.proxyUrl) {
                config.url = `${this.proxyUrl}${config?.url || ''}`;
                // Only set header if we have a key
                if (this.proxyKey) {
                    config.headers.set('x-api-key', this.proxyKey);
                }
            }
            // Special case for anify
            if (config?.url?.includes('anify')) {
                config.headers.set('User-Agent', 'consumet');
            }
            return config;
        });
    }
    /**
     * Set or Change the proxy config
     */
    setProxy(proxyConfig) {
        // Clear any existing rotation timer
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        // Early return if no URL
        if (!proxyConfig?.url)
            return;
        // Handle array of URLs
        if (Array.isArray(proxyConfig?.url)) {
            // Validate all URLs first
            for (const [i, url] of this.toMap(proxyConfig.url)) {
                if (!this.validUrl.test(url)) {
                    throw new Error(`Proxy URL at index ${i} is invalid!`);
                }
            }
            // Start rotation with validated URLs
            this.rotateProxy({ ...proxyConfig, urls: proxyConfig.url });
            return;
        }
        // Handle single URL
        if (!this.validUrl.test(proxyConfig.url)) {
            throw new Error('Proxy URL is invalid!');
        }
        // Store proxy settings (used by interceptor)
        this.proxyUrl = proxyConfig.url;
        this.proxyKey = proxyConfig.key ?? null;
    }
    /**
     * Set or Change the axios adapter
     */
    setAxiosAdapter(adapter) {
        axios_1.default.defaults.adapter = adapter;
    }
}
exports.Proxy = Proxy;
exports.default = Proxy;
//# sourceMappingURL=proxy.js.map