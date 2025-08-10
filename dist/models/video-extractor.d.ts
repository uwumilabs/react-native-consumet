import type { IVideo, ISource } from '.';
/**
 * Interface for video extractors - can be implemented by both classes and functions
 */
export interface IVideoExtractor {
    /**
     * The server name of the video provider
     */
    serverName: string;
    /**
     * list of videos available
     */
    sources: IVideo[];
    /**
     * takes video link
     *
     * returns video sources (video links) available
     */
    extract(videoUrl: URL, ...args: any): Promise<IVideo[] | ISource>;
}
/**
 * Abstract class for video extractors - for class-based implementations
 */
declare abstract class VideoExtractor {
    /**
     * The server name of the video provider
     */
    protected abstract serverName: string;
    /**
     * list of videos available
     */
    protected abstract sources: IVideo[];
    /**
     * takes video link
     *
     * returns video sources (video links) available
     */
    protected abstract extract(videoUrl: URL, ...args: any): Promise<IVideo[] | ISource>;
}
export default VideoExtractor;
//# sourceMappingURL=video-extractor.d.ts.map