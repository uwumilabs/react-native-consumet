import BaseParser from './base-parser';
import type { ILightNovelChapterContent, ILightNovelInfo } from './types';

abstract class LightNovelParser extends BaseParser {
  /** The novel with its chapters; takes its URL or id */
  abstract fetchLightNovelInfo(lightNovelUrl: string, ...args: any[]): Promise<ILightNovelInfo>;

  /** The chapter's text */
  abstract fetchChapterContent(chapterId: string, ...args: any[]): Promise<ILightNovelChapterContent>;
}

export default LightNovelParser;
