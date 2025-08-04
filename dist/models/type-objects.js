import {} from './base-types';
import {} from './types';
export class LibgenBookObject {
    constructor() {
        this.title = '';
        this.authors = [];
        this.publisher = '';
        this.year = '';
        this.edition = '';
        this.volume = '';
        this.series = '';
        this.isbn = [];
        this.link = '';
        this.id = '';
        this.language = '';
        this.format = '';
        this.size = '';
        this.pages = '';
        this.image = '';
        this.description = '';
        this.tableOfContents = '';
        this.topic = '';
        this.hashes = new HashesObject();
    }
}
class HashesObject {
    constructor() {
        this.AICH = '';
        this.CRC32 = '';
        this.eDonkey = '';
        this.MD5 = '';
        this.SHA1 = '';
        this.SHA256 = [];
        this.TTH = '';
    }
}
export class GetComicsComicsObject {
    constructor() {
        this.image = '';
        this.title = '';
        this.year = '';
        this.size = '';
        this.excerpt = '';
        this.description = '';
        this.download = '';
        this.category = '';
        this.ufile = '';
        this.mega = '';
        this.mediafire = '';
        this.zippyshare = '';
        this.readOnline = '';
    }
}
//# sourceMappingURL=type-objects.js.map