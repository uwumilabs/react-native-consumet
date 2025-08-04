import { BaseParser } from '.';
class AnimeParser extends BaseParser {
    constructor() {
        super(...arguments);
        /**
         * if the provider has dub and it's avialable seperatly from sub set this to `true`
         */
        this.isDubAvailableSeparately = false;
    }
}
export default AnimeParser;
//# sourceMappingURL=anime-parser.js.map