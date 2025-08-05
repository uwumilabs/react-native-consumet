import type { TurboModule } from 'react-native';
export interface Spec extends TurboModule {
    bypassDdosGuard(url: string): Promise<{
        cookie: string;
    }>;
    getDdosGuardCookiesWithWebView(url: string): Promise<string>;
    makeGetRequestWithWebView(url: string, headers: {
        [key: string]: string;
    }): Promise<{
        url: string;
        response: string;
        cookies: string;
        status: string;
    }>;
    deobfuscateScript: (source: string) => Promise<string | null>;
    evaluateJavaScript: (code: string, context: string) => Promise<string>;
    loadNativeModule: (moduleId: string, code: string, context: string) => Promise<string>;
    executeModuleFunction: (moduleId: string, functionName: string, argsJson: string) => Promise<string>;
    unloadNativeModule: (moduleId: string) => Promise<void>;
}
declare const NativeConsumet: Spec;
export declare const bypassDdosGuard: (url: string) => Promise<{
    cookie: string;
}>;
export declare const getDdosGuardCookiesWithWebView: (url: string) => Promise<string>;
export declare const makeGetRequestWithWebView: (url: string, headers: {
    [key: string]: string;
}) => Promise<{
    url: string;
    response: string;
    cookies: string;
    status: string;
}>;
export declare const deobfuscateScript: (source: string) => Promise<string | null>;
export declare const evaluateJavaScript: (code: string, context: string) => Promise<string>;
export declare const loadNativeModule: (moduleId: string, code: string, context: string) => Promise<string>;
export declare const executeModuleFunction: (moduleId: string, functionName: string, argsJson: string) => Promise<string>;
export declare const unloadNativeModule: (moduleId: string) => Promise<void>;
export default NativeConsumet;
//# sourceMappingURL=NativeConsumet.d.ts.map