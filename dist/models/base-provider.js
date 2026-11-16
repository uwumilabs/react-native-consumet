"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseProvider {
    /** What the provider supports; meta providers read it instead of the provider's class. */
    capabilities;
    /** [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) code(s) of the site's language */
    languages = 'en';
    /** `true` when the site has **only** NSFW content */
    isNSFW = false;
    /** URL (not a data URL) of the site's logo, 128x128px preferred */
    logo = 'https://png.pngtree.com/png-vector/20210221/ourmid/pngtree-error-404-not-found-neon-effect-png-image_2928214.jpg';
    /** `false` when the site is down or the provider no longer works */
    isWorking = true;
    get toString() {
        return {
            name: this.name,
            baseUrl: this.baseUrl,
            lang: this.languages,
            isNSFW: this.isNSFW,
            logo: this.logo,
            classPath: this.classPath,
            isWorking: this.isWorking,
        };
    }
}
exports.default = BaseProvider;
//# sourceMappingURL=base-provider.js.map