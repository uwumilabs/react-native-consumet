"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiply = exports.deobfuscateScript = exports.makeGetRequestWithWebView = exports.getDdosGuardCookiesWithWebView = exports.bypassDdosGuard = void 0;
const react_native_1 = require("react-native");
const NativeConsumet = react_native_1.TurboModuleRegistry.getEnforcing('Consumet');
exports.bypassDdosGuard = NativeConsumet.bypassDdosGuard;
exports.getDdosGuardCookiesWithWebView = NativeConsumet.getDdosGuardCookiesWithWebView;
exports.makeGetRequestWithWebView = NativeConsumet.makeGetRequestWithWebView;
exports.deobfuscateScript = NativeConsumet.deobfuscateScript;
exports.multiply = NativeConsumet.multiply;
exports.default = NativeConsumet;
//# sourceMappingURL=NativeConsumet.js.map