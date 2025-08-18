# Changelog

## 1.0.0-rc.0 (2025-08-18)

* refactor(core): introduce extension system with ProviderManager & ExtractorManager, remove deprecate ([b2d7aa4](https://github.com/2004durgesh/react-native-consumet/commit/b2d7aa4)), closes [#1](https://github.com/2004durgesh/react-native-consumet/issues/1)
* refactor(proxy): remove proxy and other deprecated exports ([90b4794](https://github.com/2004durgesh/react-native-consumet/commit/90b4794))
* feat(build): added a build command to make dist folder ([f571c53](https://github.com/2004durgesh/react-native-consumet/commit/f571c53))
* feat(utils): create some ready to use utilities and clean all the files ([c1b7c58](https://github.com/2004durgesh/react-native-consumet/commit/c1b7c58))
* feat(zoro): first provider towards extension archiecture ([b949f71](https://github.com/2004durgesh/react-native-consumet/commit/b949f71))
* chore(providers): remove deprecated movie and news providers ([c88baa9](https://github.com/2004durgesh/react-native-consumet/commit/c88baa9))
* fix(multimovies): proxy network calls of multimovies via cloudflare based proxy ([8bb45ad](https://github.com/2004durgesh/react-native-consumet/commit/8bb45ad))
* refactor(himovies, tmdb): get release date in search from fetchMediaInfo and fix tmdb mapping ([c1c9328](https://github.com/2004durgesh/react-native-consumet/commit/c1c9328))

## 0.9.0 (2025-07-28)

* fix(ci): fix type definition error in vidcloud.ts that caused ci to fail ([8897ee3](https://github.com/2004durgesh/react-native-consumet/commit/8897ee3))
* fix(megacloud): improve the scraper and remove log statements ([5c3a58c](https://github.com/2004durgesh/react-native-consumet/commit/5c3a58c))
* feat(multistream): implement multistream provider ([0a0cd6b](https://github.com/2004durgesh/react-native-consumet/commit/0a0cd6b))
* fix(anilist | animepahe): fix the normalized episode merging issue ([37a8615](https://github.com/2004durgesh/react-native-consumet/commit/37a8615))

## 0.8.0 (2025-07-07)

* feat(provider): update anime and movie providers ([7b898ba](https://github.com/2004durgesh/react-native-consumet/commit/7b898ba))

## <small>0.7.2 (2025-06-23)</small>

* feat: add Luffy extractor, AnimeOwl provider, and deobfuscator; fix Megacloud/Vidcloud ([08ba6bd](https://github.com/2004durgesh/react-native-consumet/commit/08ba6bd))

## <small>0.7.1 (2025-06-10)</small>

* fix(multimovies | streamwish): add referrer in stremwish to get the hls links properly ([5671864](https://github.com/2004durgesh/react-native-consumet/commit/5671864))

## 0.7.0 (2025-05-08)

* feat: refactor getSources method, add HiMovies provider, and update MegaUp decryption ([22efedb](https://github.com/2004durgesh/react-native-consumet/commit/22efedb))

## <small>0.6.2 (2025-05-01)</small>

* feat: add cookie fetching methods for netflix-mirror requests ([87fef82](https://github.com/2004durgesh/react-native-consumet/commit/87fef82))
* feat(netflixmirror): new movie provider ([5292387](https://github.com/2004durgesh/react-native-consumet/commit/5292387))

## <small>0.6.1 (2025-04-27)</small>

* fix(anilist | animepahe): enhance episode merging with release date handling ([a2a897a](https://github.com/2004durgesh/react-native-consumet/commit/a2a897a))

## 0.6.0 (2025-04-26)

* feat: enhance ddos guard with webview cookie retrieval and update animepahe integration ([c4d568a](https://github.com/2004durgesh/react-native-consumet/commit/c4d568a))
* feat: implement DDoS guard bypass functionality and update related modules and fixing id in tmdb ([f630451](https://github.com/2004durgesh/react-native-consumet/commit/f630451))

## 0.5.0 (2025-04-22)

* feat: update URL logic for consumet-android, multimovies, zoro ([a1471fe](https://github.com/2004durgesh/react-native-consumet/commit/a1471fe))

## <small>0.4.3 (2025-04-20)</small>

* feat(animepahe): download links in animepahe ([88712a0](https://github.com/2004durgesh/react-native-consumet/commit/88712a0))
* fix(anilist): ani-zip interface and some fixings in lib ([9cd439c](https://github.com/2004durgesh/react-native-consumet/commit/9cd439c))

## <small>0.4.2 (2025-04-18)</small>

* fix(anilist): optimize episode merging ([bf2df23](https://github.com/2004durgesh/react-native-consumet/commit/bf2df23))
* docs: update readme [skip ci] ([0b2c15b](https://github.com/2004durgesh/react-native-consumet/commit/0b2c15b))

## <small>0.4.1 (2025-04-16)</small>

* fix: enhance megaup extractor with new kaicodex integration ([ccafb22](https://github.com/2004durgesh/react-native-consumet/commit/ccafb22))

## v0.4.0 (2025-04-13)

* feat: use cdn for js assets in consumet-module to decrease the size of bundle ([0aea2e4](https://github.com/2004durgesh/react-native-consumet/commit/0aea2e4))

## v0.3.0 (2025-04-12)

* feat(meta): improve fetchEpisodesListById and tmdb, code format, update base url of zoro ([85d3da7](https://github.com/2004durgesh/react-native-consumet/commit/85d3da7))
* feat(prettier): improve dx [skip ci] ([0e950c4](https://github.com/2004durgesh/react-native-consumet/commit/0e950c4))
* fix(streamwish,megaup): fix streamwish and megaup extractors and remove old providers ([955bbe9](https://github.com/2004durgesh/react-native-consumet/commit/955bbe9))

## <small>v0.2.2 (2025-04-04)</small>

* fix(megaup): fix megaup decoding logic ([e761ffe](https://github.com/2004durgesh/react-native-consumet/commit/e761ffe))
* chore: migrate example to bare-example structure and remove deprecated files ([fbd25b4](https://github.com/2004durgesh/react-native-consumet/commit/fbd25b4))

## <small>v0.2.1 (2025-04-02)</small>

* chore(eslint | tsconfig): add jest.setup.js to ignored files, update exclude list ([3779930](https://github.com/2004durgesh/react-native-consumet/commit/3779930))
* first commit ([d8ef215](https://github.com/2004durgesh/react-native-consumet/commit/d8ef215))
* chore(jest): refine config and setup, update issue and PR templates ([622d6ef](https://github.com/2004durgesh/react-native-consumet/commit/622d6ef))
* chore(package): add infile option for conventional changelog ([f8780b2](https://github.com/2004durgesh/react-native-consumet/commit/f8780b2))
* fix(types): fix all type issues and add docs and test ([f30fb53](https://github.com/2004durgesh/react-native-consumet/commit/f30fb53))

## v0.2.0 (2025-04-02)

* chore(jest): refine config and setup, update issue and PR templates ([622d6ef](https://github.com/2004durgesh/react-native-consumet/commit/622d6ef))
* chore(package): add infile option for conventional changelog ([bd2b6ed](https://github.com/2004durgesh/react-native-consumet/commit/bd2b6ed))
* fix(types): fix all type issues and add docs and test ([f30fb53](https://github.com/2004durgesh/react-native-consumet/commit/f30fb53))
* first commit ([d8ef215](https://github.com/2004durgesh/react-native-consumet/commit/d8ef215))
