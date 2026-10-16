"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetMirrorParser = void 0;
const models_1 = require("../../../models");
const provider_args_1 = require("../../provider-args");
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
    constructor(factory, ctxOrBaseURL, customBaseURL) {
        super();
        const [ctx, baseURL] = (0, provider_args_1.providerArgs)(ctxOrBaseURL, customBaseURL);
        this.instance = factory(ctx, baseURL);
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
exports.NetMirrorParser = NetMirrorParser;
//# sourceMappingURL=netmirror-parser.js.map