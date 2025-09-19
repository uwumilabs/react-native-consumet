import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../models';

/**
 * Kwik extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function Kwik(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'kwik';
  const sources: IVideo[] = [];
  const { axios, load, USER_AGENT, PolyURL } = ctx;
  function unPack(code: string) {
    function indent(code: string[]) {
      try {
        let tabs = 0,
          old = -1,
          add = '';
        for (let i = 0; i < code.length; i++) {
          if (code[i]!.includes('{')) tabs++;
          if (code[i]!.includes('}')) tabs--;

          if (old !== tabs) {
            old = tabs;
            add = '';
            while (old > 0) {
              add += '\t';
              old--;
            }
            old = tabs;
          }

          code[i] = add + code[i];
        }
      } finally {
        // let GC cleanup
      }
      return code;
    }

    let captured = '';

    // fake environment
    const env = {
      eval: function (c: string) {
        captured = c;
      },
      window: {},
      document: {},
    };

    // Instead of `with`, run inside a Function with env injected
    const runner = new Function(
      'env',
      `
    const { eval, window, document } = env;
    ${code}
  `
    );

    runner(env);

    // prettify captured code
    captured = (captured + '')
      .replace(/;/g, ';\n')
      .replace(/{/g, '\n{\n')
      .replace(/}/g, '\n}\n')
      .replace(/\n;\n/g, ';\n')
      .replace(/\n\n/g, '\n');

    let lines = captured.split('\n');
    lines = indent(lines);

    return lines.join('\n');
  }
  // @ts-ignore
  const extract = async (videoUrl: PolyURL, referer = 'https://animepahe.si/'): Promise<ISource> => {
    const extractedData: ISource = {
      // subtitles: [],
      // intro: { start: 0, end: 0 },
      // outro: { start: 0, end: 0 },
      sources: [],
    };

    try {
      const response = await fetch(`${videoUrl.href}`, {
        headers: {
          'Referer': referer,
          'User-Agent': USER_AGENT!,
        },
      });

      const data = await response.text();

      const unpackedSourceCode = unPack(data.match(/<script\b[^>]*>\s*(eval\([\s\S]*?\))\s*<\/script>/i)![1]!);
      const re = /https?:\/\/[^'"\s]+?\.m3u8(?:\?[^'"\s]*)?/i;
      const source = unpackedSourceCode.match(re)![0]!;
      extractedData.sources.push({
        url: source,
        isM3U8: source.includes('.m3u8'),
      });

      return extractedData;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}
