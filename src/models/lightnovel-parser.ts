import BaseParser from './base-parser';

abstract class LightNovelParser extends BaseParser {
  /** The novel with its chapters; takes its URL or id */
  protected abstract fetchLightNovelInfo(lightNovelUrl: string, ...args: any): Promise<unknown>;

  /** The chapter's text */
  protected abstract fetchChapterContent(chapterId: string, ...args: any): Promise<unknown>;
}

export default LightNovelParser;
