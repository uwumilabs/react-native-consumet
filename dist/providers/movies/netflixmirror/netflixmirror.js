"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const utils_1 = require("../../../utils");
const create_netflixmirror_1 = require("./create-netflixmirror");
// Backward compatibility wrapper class
class NetflixMirror extends models_1.MovieParser {
    constructor(customBaseURL) {
        var _a;
        super();
        // Use the context factory to create a complete context with all defaults
        const defaultContext = (0, utils_1.createProviderContext)();
        this.instance = (0, create_netflixmirror_1.createNetflixMirror)(defaultContext, customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = (_a = this.instance.isWorking) !== null && _a !== void 0 ? _a : true;
        // Bind all methods to preserve proper typing
        this.search = this.instance.search;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchHlsPlaylist = this.instance.fetchHlsPlaylist;
    }
}
exports.default = NetflixMirror;
//# sourceMappingURL=netflixmirror.js.map