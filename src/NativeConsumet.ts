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

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const deobfuscateScript = NativeConsumet.deobfuscateScript;
export const evaluateJavaScript = NativeConsumet.evaluateJavaScript;
export const loadNativeModule = NativeConsumet.loadNativeModule;
export const executeModuleFunction = NativeConsumet.executeModuleFunction;
export const unloadNativeModule = NativeConsumet.unloadNativeModule;

export default NativeConsumet;
