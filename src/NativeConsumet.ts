import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getSources(embedUrl: string, site: string): Promise<string>;
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
}

const NativeConsumet = TurboModuleRegistry.getEnforcing<Spec>('Consumet');

export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const getSources = NativeConsumet.getSources;

export default NativeConsumet;
