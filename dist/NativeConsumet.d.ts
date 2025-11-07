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
        html: string;
        cookies: string;
        status: string;
    }>;
    makePostRequestWithWebView(url: string, headers: {
        [key: string]: string;
    }, body: string): Promise<{
        url: string;
        response: string;
        cookies: string;
        status: string;
        contentType: string;
    }>;
    makePostRequest(url: string, headers: {
        [key: string]: string;
    }, body: string): Promise<{
        statusCode: number;
        body: string;
        headers: {
            [key: string]: string;
        };
    }>;
    deobfuscateScript: (source: string) => Promise<string | null>;
    multiply: (a: number, b: number) => number;
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
    html: string;
    cookies: string;
    status: string;
}>;
export declare const makePostRequestWithWebView: (url: string, headers: {
    [key: string]: string;
}, body: string) => Promise<{
    url: string;
    response: string;
    cookies: string;
    status: string;
    contentType: string;
}>;
export declare const makePostRequest: (url: string, headers: {
    [key: string]: string;
}, body: string) => Promise<{
    statusCode: number;
    body: string;
    headers: {
        [key: string]: string;
    };
}>;
export declare const deobfuscateScript: (source: string) => Promise<string | null>;
export declare const multiply: (a: number, b: number) => number;
export default NativeConsumet;
//# sourceMappingURL=NativeConsumet.d.ts.map