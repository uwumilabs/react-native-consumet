import BaseParser from './base-parser';
import type { IMangaInfo, IMangaChapterPage } from './types';

abstract class MangaParser extends BaseParser {
  /** The manga with its chapters */
  abstract fetchMangaInfo(mangaId: string, ...args: any): Promise<IMangaInfo>;

  /** The chapter's page images */
  abstract fetchChapterPages(chapterId: string, ...args: any): Promise<IMangaChapterPage[]>;
}

export default MangaParser;
