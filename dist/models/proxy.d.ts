import { type AxiosAdapter, type AxiosInstance } from 'axios';
import type { ProxyConfig } from './types';
export declare class Proxy {
    protected proxyConfig?: ProxyConfig | undefined;
    protected adapter?: AxiosAdapter | undefined;
    protected client: AxiosInstance;
    private validUrl;
    private proxyUrl;
    private proxyKey;
    private rotationTimer;
    constructor(proxyConfig?: ProxyConfig | undefined, adapter?: AxiosAdapter | undefined);
    private setupInterceptor;
    /**
     * Set or Change the proxy config
     */
    setProxy(proxyConfig: ProxyConfig): void;
    /**
     * Set or Change the axios adapter
     */
    setAxiosAdapter(adapter: AxiosAdapter): void;
    private rotateProxy;
    private toMap;
}
export default Proxy;
//# sourceMappingURL=proxy.d.ts.map