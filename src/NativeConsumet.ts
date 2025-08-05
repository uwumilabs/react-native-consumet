import axios from "axios";
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
}

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const deobfuscateScript = NativeConsumet.deobfuscateScript;

export default NativeConsumet;
