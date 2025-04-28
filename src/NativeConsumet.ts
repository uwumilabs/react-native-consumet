import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface WebViewPostResponse {
  requestCookies: string;
  responseCookies: string;
  url: string;
  response: string;
  status: string;
}

export interface OkHttpResponse {
  cookies: string;
  url: string;
  response: string;
  status: string;
}

export interface Spec extends TurboModule {
  getSources(xrax: string): Promise<string>;
  bypassDdosGuard(url: string): Promise<{ cookie: string }>;
  getDdosGuardCookiesWithWebView(url: string): Promise<string>;
  makePostRequestWithWebView(url: string, postBody: string, mimeType: string): Promise<WebViewPostResponse>;
  makePostRequestWithOkHttp(url: string, postBody: string, mimeType: string): Promise<OkHttpResponse>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Consumet');
