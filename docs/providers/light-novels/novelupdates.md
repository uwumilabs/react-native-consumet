<h1>NovelUpdates</h1>

```ts
const novelupdates = new LIGHT_NOVELS.NovelUpdates();
```

The constructor takes an optional provider context, `new LIGHT_NOVELS.NovelUpdates(ctx?)`, whose axios makes every request (default: `createProviderContext()`). See the [light novels guide](../../guides/light-novels.md).

NovelUpdates is behind Cloudflare. When Cloudflare answers with its challenge page instead of the site's, the methods reject with `NovelUpdates: Cloudflare blocked the request`.

<h2>Methods</h2>

- [search](#search)
- [fetchLightNovelInfo](#fetchlightnovelinfo)
- [fetchChapterContent](#fetchchaptercontent)

### search

> Note: This method is a subclass of the [`BaseParser`](../../../src/models/base-parser.ts) class. meaning it is available across most categories.

<h4>Parameters</h4>

| Parameter | Type     | Description                                                                         |
| --------- | -------- | ----------------------------------------------------------------------------------- |
| query     | `string` | query to search for. (_In this case, We're searching for `Classrrom of the Elite`_) |

```ts
novelupdates.search('Clasroom of the Elite').then((data) => {
  console.log(data);
});
```

returns a promise which resolves into an array of light novels. (_<a href= "../../../src/models/types.ts"> <code>Promise<ISearch\<ILightNovelResult>></code></a>_)\
output:

```js
{
  results: [
    {
      id: 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e', // the light novel id
      title: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
      url: 'https://www.novelupdates.com/series/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/',
      image: 'https://cdn.novelupdates.com/imgmid/series_10266.jpg'
    },
    {...}
    ...
  ]
}
```

### fetchLightNovelInfo

<h4>Parameters</h4>

| Parameter              | Type     | Description                                                                                            |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| lightNovelUrl          | `string` | id or url of the light novel. (_light novel id or url can be found in the light novel search results_) |
| chapterPage (optional) | `number` | ignored: NovelUpdates lists every chapter in one request                                               |

```ts
novelupdates
  .fetchLightNovelInfo('youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e')
  .then((data) => {
    console.log(data);
  });
```

returns a promise which resolves into an light novel info object (including the chapters or volumes). (_<a href="../../../src/models/types.ts"><code>Promise\<ILightNovelInfo></code></a>_)\
output:

```js
{
  id: 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e',
  title: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
  url: 'https://www.novelupdates.com/series/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e',
  image: 'https://cdn.novelupdates.com/images/2017/02/cover00219.jpeg',
  author: 'Kinugasa Shougo衣笠彰梧',
  genres: [
    'Drama',
    'Psychological',
    '...'
  ],
  rating: 9,
  views: NaN,
  description: 'Kōdo Ikusei Senior High School, a leading prestigious school with state-of-the-art facilities where nearly...',
  status: 'Completed',
  chapters: [
    {
      id: '6659442',
      title: 'v17...',
      url: 'https://www.novelupdates.com/extnu/6659442'
    },
    {...}
    ...
```

### fetchChapterContent

Not supported. NovelUpdates lists each chapter as a link to the translator's own site (the chapter's `url`, which redirects there), and those sites' pages differ from one another, so NovelUpdates has no chapter text to return. `fetchChapterContent` always rejects with an error saying so; open the chapter's `url` instead.

<p align="end">(<a href="../../guides/light-novels.md">back to light novels providers list</a>)</p>
