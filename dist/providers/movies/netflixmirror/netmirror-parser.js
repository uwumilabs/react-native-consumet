"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const utils_1 = require("../../../utils");
// Backward compatibility wrapper shared by the NetflixMirror, PrimeMirror and DisneyMirror classes
class NetMirrorParser extends models_1.MovieParser {
    instance;
    logo;
    name;
    baseUrl;
    classPath;
    supportedTypes;
    isNSFW;
    isWorking;
    constructor(factory, customBaseURL) {
        super();
        this.instance = factory((0, utils_1.createProviderContext)(), customBaseURL);
        this.logo = this.instance.logo;
        this.name = this.instance.name;
        this.baseUrl = this.instance.baseUrl;
        this.classPath = this.instance.classPath;
        this.supportedTypes = this.instance.supportedTypes;
        this.isNSFW = this.instance.isNSFW;
        this.isWorking = this.instance.isWorking ?? true;
        this.search = this.instance.search;
        this.fetchMediaInfo = this.instance.fetchMediaInfo;
        this.fetchEpisodeSources = this.instance.fetchEpisodeSources;
        this.fetchEpisodeServers = this.instance.fetchEpisodeServers;
        this.fetchHlsPlaylist = this.instance.fetchHlsPlaylist;
    }
    search;
    fetchMediaInfo;
    fetchEpisodeSources;
    fetchEpisodeServers;
    fetchHlsPlaylist;
}
exports.default = NetMirrorParser;
//# sourceMappingURL=netmirror-parser.js.map