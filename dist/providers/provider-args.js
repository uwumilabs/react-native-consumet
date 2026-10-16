"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerArgs = providerArgs;
const create_provider_context_1 = require("../utils/create-provider-context");
/**
 * Reads the arguments of a provider class wrapper. Wrappers take `(ctx?, customBaseURL?)`, the
 * order of the factories they wrap, or the older `(customBaseURL?)`. Without a context they get
 * `createProviderContext()`.
 */
function providerArgs(ctxOrBaseURL, customBaseURL) {
    if (typeof ctxOrBaseURL === 'string')
        return [(0, create_provider_context_1.createProviderContext)(), ctxOrBaseURL];
    return [ctxOrBaseURL ?? (0, create_provider_context_1.createProviderContext)(), customBaseURL];
}
//# sourceMappingURL=provider-args.js.map