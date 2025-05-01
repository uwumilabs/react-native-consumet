import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getSources(xrax: string): Promise<string>;
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

export default TurboModuleRegistry.getEnforcing<Spec>('Consumet');
