import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  bypassDdosGuard(url: string): Promise<{ cookie: string }>;
  getDdosGuardCookiesWithWebView(url: string): Promise<string>;
  makeGetRequestWithWebView(
    url: string,
    headers: { [key: string]: string }
  ): Promise<{
    url: string;
    html: string;
    cookies: string;
    status: string;
  }>;
  makePostRequestWithWebView(
    url: string,
    headers: { [key: string]: string },
    body: string
  ): Promise<{
    url: string;
    response: string;
    cookies: string;
    status: string;
    contentType: string;
  }>;
  makePostRequest(
    url: string,
    headers: { [key: string]: string },
    body: string
  ): Promise<{
    statusCode: number;
    body: string;
    headers: { [key: string]: string };
  }>;
  deobfuscateScript: (source: string) => Promise<string | null>;
  multiply: (a: number, b: number) => number;
}

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const makePostRequestWithWebView = NativeConsumet.makePostRequestWithWebView;
export const makePostRequest = NativeConsumet.makePostRequest;
export const deobfuscateScript = NativeConsumet.deobfuscateScript;
export const multiply = NativeConsumet.multiply;

export default NativeConsumet;
