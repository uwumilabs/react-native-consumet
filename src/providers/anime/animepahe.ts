import { load } from 'cheerio';

import {
  AnimeParser,
  type ISearch,
  type IAnimeInfo,
  MediaStatus,
  type IAnimeResult,
  type ISource,
  type IAnimeEpisode,
  type IEpisodeServer,
  MediaFormat,
} from '../../models';
import { Kwik } from '../../extractors';

class AnimePahe extends AnimeParser {
  override readonly name = 'AnimePahe';
  protected override baseUrl = 'https://animepahe.ru';
  protected override logo = 'https://animepahe.com/pikacon.ico';
  protected override classPath = 'ANIME.AnimePahe';

  // private readonly sgProxy = 'https://cors.consumet.stream';

  /**
   * @param query Search query
   */
  override search = async (query: string): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await this.client.get(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
        headers: this.Headers(false),
      });

      const res = {
        results: data.data.map((item: any) => ({
          id: item.session,
          title: item.title,
          image: item.poster,
          rating: item.score,
          releaseDate: item.year,
          type: item.type,
        })),
      };

      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param id id format id/session
   * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
   */
  override fetchAnimeInfo = async (id: string, episodePage: number = -1): Promise<IAnimeInfo> => {
    const animeInfo: IAnimeInfo = {
      id: id,
      title: '',
    };
    console.log(`${this.baseUrl}/anime/${id}`, this.Headers(id));
    try {
      const res = await fetch(`${this.baseUrl}/anime/${id}`, {
        headers: this.Headers(id),
      });
      const data = await res.text();
      const $ = load(data);

      animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
      animeInfo.image = $('div.anime-poster a').attr('href');
      animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
      animeInfo.description = $('div.anime-summary').text().trim();
      animeInfo.genres = $('div.anime-genre ul li')
        .map((i, el) => $(el).find('a').attr('title'))
        .get();
      animeInfo.hasSub = true;

      switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
        case 'Currently Airing':
          animeInfo.status = MediaStatus.ONGOING;
          break;
        case 'Finished Airing':
          animeInfo.status = MediaStatus.COMPLETED;
          break;
        default:
          animeInfo.status = MediaStatus.UNKNOWN;
      }
      animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase() as MediaFormat;
      animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
        .text()
        .split('to')[0]!
        .replace('Aired:', '')
        .trim();
      animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
      animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));
      animeInfo.recommendations = [];
      $('div.anime-recommendation .col-sm-6').each((i, el) => {
        animeInfo.recommendations?.push({
          id: $(el).find('.col-2 > a').attr('href')?.split('/')[2]!,
          title: $(el).find('.col-2 > a').attr('title')!,
          image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
          url: `${this.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
          releaseDate: $(el).find('div.col-9 > a').text().trim(),
          status: $(el).find('div.col-9 > strong').text().trim() as MediaStatus,
        });
      });

      animeInfo.relations = [];
      $('div.anime-relation .col-sm-6').each((i, el) => {
        animeInfo.relations?.push({
          id: $(el).find('.col-2 > a').attr('href')?.split('/')[2]!,
          title: $(el).find('.col-2 > a').attr('title')!,
          image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
          url: `${this.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
          releaseDate: $(el).find('div.col-9 > a').text().trim(),
          status: $(el).find('div.col-9 > strong').text().trim() as MediaStatus,
          relationType: $(el).find('h4 > span').text().trim(),
        });
      });

      animeInfo.episodes = [];
      if (episodePage < 0) {
        const {
          data: { last_page, data },
        } = await this.client.get(`${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
          headers: this.Headers(id),
        });

        animeInfo.episodePages = last_page;

        animeInfo.episodes.push(
          ...data.map(
            (item: any) =>
              ({
                id: `${id}/${item.session}`,
                number: item.episode,
                title: item.title,
                image: item.snapshot,
                duration: item.duration,
                url: `${this.baseUrl}/play/${id}/${item.session}`,
              }) as IAnimeEpisode
          )
        );

        for (let i = 1; i < last_page; i++) {
          animeInfo.episodes.push(...(await this.fetchEpisodes(id, i + 1)));
        }
      } else {
        animeInfo.episodes.push(...(await this.fetchEpisodes(id, episodePage)));
      }

      return animeInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId episode id
   */
  override fetchEpisodeSources = async (episodeId: string): Promise<ISource> => {
    try {
      const { data } = await this.client.get(`${this.baseUrl}/play/${episodeId}`, {
        headers: this.Headers(episodeId.split('/')[0]!),
      });

      const $ = load(data);

      const links = $('div#resolutionMenu > button').map((i, el) => ({
        url: $(el).attr('data-src')!,
        quality: $(el).text(),
        audio: $(el).attr('data-audio'),
      }));

      const iSource: ISource = {
        headers: {
          Referer: 'https://kwik.cx/',
        },
        sources: [],
      };
      for (const link of links) {
        const res = await new Kwik(this.proxyConfig).extract(new URL(link.url));
        res[0]!.quality = link.quality;
        res[0]!.isDub = link.audio === 'eng';
        iSource.sources.push(res[0]!);
      }

      return iSource;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  private fetchEpisodes = async (session: string, page: number): Promise<IAnimeEpisode[]> => {
    const res = await this.client.get(`${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, {
      headers: this.Headers(session),
    });

    const epData = res.data.data;

    return [
      ...epData.map(
        (item: any): IAnimeEpisode => ({
          id: `${session}/${item.session}`,
          number: item.episode,
          title: item.title,
          image: item.snapshot,
          duration: item.duration,
          url: `${this.baseUrl}/play/${session}/${item.session}`,
        })
      ),
    ] as IAnimeEpisode[];
  };

  /**
   * @deprecated
   * @attention AnimePahe doesn't support this method
   */
  override fetchEpisodeServers = (episodeLink: string): Promise<IEpisodeServer[]> => {
    throw new Error('Method not implemented.');
  };

  private Headers(sessionId: string | false) {
    return {
      'authority': 'animepahe.ru',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'Cookie':
        '__ddg8_=t30Kk4WN3QXxGGeS; __ddg10_=1743778081; __ddg9_=103.123.226.218; __ddgid_=UyBX8L5x2N3PVwHQ; __ddgmark_=zzjwIU0XrzYhLZNA; __ddg2_=mYFJpxSZiwbzc2Lj; __ddg1_=dyfub1Uw7hUQG4jJhFzD; XSRF-TOKEN=eyJpdiI6Ii9qdkJOVkdIckU4c3pURnE4UGQwRGc9PSIsInZhbHVlIjoiWFd0L3hJaXA2MmZ4emtuSnFTWFNnemtPaHdwMmpISDkwV2VtVDJ5Tjl1VVFHNEd0aXlPNzRTTkZ4ZXRHUVliZzhWbng1cEV3MjgvMWFtekRETkRpY0pOTE9sNkM3enVVeGxGTExTRzlkZUhmZUtlZVAwRitOYVUvaGdBV0J1a04iLCJtYWMiOiI3OWEwZDZhZmQwMmJhYjZlZmU3MDFiN2EyM2E2ZDU2MjE0YTNhNWI3MGEwZTQzZDEzYTIyMGY4OTVhYWMzYzI0IiwidGFnIjoiIn0%3D; laravel_session=eyJpdiI6Im5jdVZKbjBpck56eEtlWEhzNVFGR0E9PSIsInZhbHVlIjoiWG42MjV4RmVFa1hNcVUvWFFaRDlQdmZsbU53UlMvRUFzL0padFRTcFhSYmhJaWJ5R3RheW11SElCcGl5NkRxUkMwdW8rUTFKMW5qblBRV2xHMmZXZHd3S3dMMExVTHVVamNwZk1IMkJIRmUwcjMrV0VXM2JEcWJZb2FOTXNmaWgiLCJtYWMiOiI3ODk4YWJkYjM0ZGVkZDYzNWUxNWQxMjFhOGZkYWQ3Yzc2ZmIzN2Q1MGUyMjcxMGQxNTU5YTNjNTU3MGE5YTRmIiwidGFnIjoiIn0%3D; latest=6081; res=1080; aud=jpn; av1=0',
      'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      'Referer': `${this.baseUrl}/`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    };
  }
}

export default AnimePahe;

// (async () => {
//   const animepahe = new AnimePahe();

//   const anime = await animepahe.search('Classroom of the elite');
//   const info = await animepahe.fetchAnimeInfo(anime.results[0].id);
//   // console.log(info);
//   const sources = await animepahe.fetchEpisodeSources(info.episodes![0].id);
//   console.log(sources);
// })();
