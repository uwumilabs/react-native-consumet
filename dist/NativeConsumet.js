import { TurboModuleRegistry } from 'react-native';
const NativeConsumet = TurboModuleRegistry.getEnforcing('Consumet');
export const bypassDdosGuard = NativeConsumet.bypassDdosGuard;
export const getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
export const makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
export const deobfuscateScript = NativeConsumet.deobfuscateScript;
export default NativeConsumet;
//# sourceMappingURL=NativeConsumet.js.map