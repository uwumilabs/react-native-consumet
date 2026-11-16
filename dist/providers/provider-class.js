"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.providerClass = providerClass;
const create_provider_context_1 = require("../utils/create-provider-context");
/**
 * The class form of a provider factory, e.g. `providerClass(AnimeParser, createZoro)` for `new ANIME.Zoro()`.
 * Registry code only has the factory; the class exists so bundled providers keep `new` and `instanceof`.
 */
function providerClass(Base, factory) {
  const Parser = Base;
  class Provider extends Parser {
    constructor(ctxOrBaseURL, customBaseURL) {
      super();
      const ctx = typeof ctxOrBaseURL === 'string' || !ctxOrBaseURL ? (0, create_provider_context_1.createProviderContext)() : ctxOrBaseURL;
      const baseURL = typeof ctxOrBaseURL === 'string' ? ctxOrBaseURL : customBaseURL;
      for (var _len = arguments.length, rest = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        rest[_key - 2] = arguments[_key];
      }
      Object.assign(this, factory(ctx, baseURL, ...rest));
    }
  }
  return Provider;
}
//# sourceMappingURL=provider-class.js.map