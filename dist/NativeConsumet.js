"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeMethods = void 0;
const react_native_1 = require("react-native");
const NativeConsumet = react_native_1.TurboModuleRegistry.getEnforcing('Consumet');
/** The spec's methods in a plain object (extension code destructures and spreads it). */
exports.nativeMethods = {
    bypassDdosGuard: NativeConsumet.bypassDdosGuard,
    getDdosGuardCookiesWithWebView: NativeConsumet.getDdosGuardCookiesWithWebView,
    makeGetRequestWithWebView: NativeConsumet.makeGetRequestWithWebView,
    makePostRequestWithWebView: NativeConsumet.makePostRequestWithWebView,
    makePostRequest: NativeConsumet.makePostRequest,
    deobfuscateScript: NativeConsumet.deobfuscateScript,
};
exports.default = NativeConsumet;
//# sourceMappingURL=NativeConsumet.js.map