# Changelog

## [2.0.0](https://github.com/uwumilabs/react-native-consumet/compare/v1.6.0...v2.0.0) (2026-10-18)

### ⚠ BREAKING CHANGES

* **providers:** ANIME.Anify, ANIME.AnimeDrive, ANIME.Marin, ANIME.AnimeUnity and
MANGA.ReadManga are no longer exported.
* **anilist:** AniList results no longer include imageHash, coverHash or trailer.thumbnailHash
(always the placeholder 'hash'), and getHashFromImage is removed from src/utils/utils.ts. A
search result without a banner now has its cover image as cover instead of null.

Refs: META-11
* **utils:** PolyURL and PolyURLSearchParams follow the URL Standard. Invalid input or an
invalid base now throws a TypeError instead of giving a broken URL, so pass a base or catch when
parsing scraped URLs. pathname keeps its percent-encoding, and query strings serialize a space
as + and keep repeated names in order.
* **meta:** when some but not all season requests fail, TMDB.fetchMediaInfo resolves with
those seasons empty and `failed: true` instead of rejecting. Search and trending results with no
date have no releaseDate instead of "NaN". A movie's season image is its poster, not its backdrop.
* **meta:** Myanimelist startDate/endDate months are 1-based (one higher than before), and
day or month is unset when MAL doesn't give it. title.native, title.english and synonyms come
from the labelled rows: english and userPreferred are unset, not another language's title, when
MAL has no English title. Myanimelist is deprecated.
* **native:** NativeConsumet.multiply is removed: the spec method, the multiply export of
src/NativeConsumet.ts and `multiply` on ProviderContext['NativeConsumet'] and
ExtractorContext['NativeConsumet']. Extension code and apps that called it should compute a * b
in JavaScript.
* **managers:** fetch in extension code resolves with ok: false for 4xx and 5xx responses
instead of throwing, and text() returns a string for JSON responses. loadExtractor returns an
extractor instance for bundled fallbacks instead of the factory or class.

Refs: UTIL-2
* **meta:** uniqueId values change for episodes matched to ani.zip whose TVDB number differs
from their AniDB number, and for episodes that carried a special's key. 1.6.0 built
`${anilistId}$ep=${tvdbEpisodeNumber ?? aniZipKey}`; it is now
`${anilistId}$ep=${aniDbKey ?? providerNumber}`. For 162670 (Dr. Stone: New World Part 2)
162670$ep=12..22 become 162670$ep=1..11; Re:Zero (21355) regular episodes keep 21355$ep=1..25
and 21355$ep=S1/O1-style keys are no longer produced. Matched episodes keep the provider's
number instead of the TVDB one. See docs/migrations/uniqueid.md for the exact mapping and a
migration recipe for stored progress.
* **meta:** IMovieEpisode.id is optional, since TMDB lists episodes the provider doesn't
have, and IMovieInfo.duration is `string | number`. See docs/migrations/tmdb-info.md.
* **meta:** `id` from TMDB.fetchMediaInfo is now the TMDB id instead of the provider's media
id. Pass `providerId` to the movie provider instead. See docs/migrations/tmdb-info.md.
* **registry:** executeProviderCode and executeExtractorCode now throw IntegrityError when
code doesn't match its registry sha256 or the entry has none. Apps that cache code should
re-download on IntegrityError.

### Features

* **example:** load registry providers through the real fetch and integrity path ([3bea85e](https://github.com/uwumilabs/react-native-consumet/commit/3bea85e47eaabc2f3d7e6af7de882aabfc33a28d))
* **exports:** export flixcloud, the parser bases and the context types ([2d666f8](https://github.com/uwumilabs/react-native-consumet/commit/2d666f840dca839056e2d27244efe8041f4f31ab))
* **extractors:** resolve server names from registry extractor names and aliases ([d97e05f](https://github.com/uwumilabs/react-native-consumet/commit/d97e05fc345db343c90cd08a8c473f5741b4b504))
* **extractors:** run registry extractor versions through one shared manager ([69e4c70](https://github.com/uwumilabs/react-native-consumet/commit/69e4c7066a36edc8f596ec294ba892056ceb9103))
* **managers:** check provider methods per category and add a generic provider getter ([f294d2c](https://github.com/uwumilabs/react-native-consumet/commit/f294d2cd24fb960a7dcabe8fcf9fcc342423e6b7))
* **meta:** add MetaError carrying the source, status and cause of failures ([d40303f](https://github.com/uwumilabs/react-native-consumet/commit/d40303f3cd0560af3ef62584ab50346fed62e0d6))
* **meta:** key anilist episodes by anidb number and match them by number first ([48107a5](https://github.com/uwumilabs/react-native-consumet/commit/48107a5809d854834f46139f44f7cd29f2bcb03b))
* **meta:** make tmdb episodes and info match the declared movie types ([63aaf60](https://github.com/uwumilabs/react-native-consumet/commit/63aaf607cd23d0a7b44853b6158c48c9b261e381))
* **meta:** return tmdb info even when the movie provider has no match ([77d7c75](https://github.com/uwumilabs/react-native-consumet/commit/77d7c750a5e49f3abb9ccf1fb6c5f2b11219028f))
* **movies:** fix netflixmirror and add prime and disney mirrors ([b875880](https://github.com/uwumilabs/react-native-consumet/commit/b8758806134f2242e3c7ac71ec5e03888bfaca35))
* **providers:** accept any registry id and type loaded providers as interfaces ([8095111](https://github.com/uwumilabs/react-native-consumet/commit/809511149faf83d63d455d390b0dfa8dbfc70024))
* **providers:** choose meta behaviour from declared capabilities instead of classes ([1f4e7ac](https://github.com/uwumilabs/react-native-consumet/commit/1f4e7ac919527633bd2a465c6294d3748ab45732))
* **providers:** pass the registry base url to provider factories ([d121ae3](https://github.com/uwumilabs/react-native-consumet/commit/d121ae325c052c99ec9f1efed3caa2ad6e6eed0a))
* **registry:** add a retention rule for published versions and a reference check ([62b3f87](https://github.com/uwumilabs/react-native-consumet/commit/62b3f870fbaa1213ab1d0e902a7bf516d30c6986))
* **registry:** check dist and registry hashes against a clean rebuild ([13dda59](https://github.com/uwumilabs/react-native-consumet/commit/13dda594dc98d8dd3969384986723e8d21d2b66a))
* **registry:** flag vegamovies and mirrors as direct-source providers ([b297743](https://github.com/uwumilabs/react-native-consumet/commit/b297743a90edb5609578d4ef24039062979fdd41))
* **registry:** publish each extension as a single-file bundle ([9cc3e56](https://github.com/uwumilabs/react-native-consumet/commit/9cc3e56e5a402eae8dfcad08642da2c98974fe7c))
* **registry:** refuse invalid registries and entries that need a newer context ([4f439dc](https://github.com/uwumilabs/react-native-consumet/commit/4f439dcfa9d9ed41ca2113b343aae5fd80039b6a))
* **registry:** verify downloaded registries with bundled ed25519 keys ([87831d6](https://github.com/uwumilabs/react-native-consumet/commit/87831d6812ab0face71e4e00aede679139f66981))
* **registry:** verify extension code on every path and publish immutable versions ([96560a8](https://github.com/uwumilabs/react-native-consumet/commit/96560a8db84fe688c754515a4878c2315e901d9e))

### Bug Fixes

* **android:** run the deobfuscator on a 16 kb page aligned quickjs ([6428d30](https://github.com/uwumilabs/react-native-consumet/commit/6428d30a19d1ba3b7614c4716472943994b7349f))
* **anilist:** map each anilist shape once and drop the fake hashes ([f119c27](https://github.com/uwumilabs/react-native-consumet/commit/f119c27455129d67329242500e190590c78358af))
* **anilist:** send every graphql value as a variable ([6cce8a5](https://github.com/uwumilabs/react-native-consumet/commit/6cce8a563c21fe2e5cf18d97544d04abb9f4124f))
* **anilist:** send real airing times and find manga chapters reliably ([e8642e6](https://github.com/uwumilabs/react-native-consumet/commit/e8642e671fabc6e2968ce08c80bc29115e846e54))
* **ci:** lint without --fix, build ios and run lint-staged before commits ([468f117](https://github.com/uwumilabs/react-native-consumet/commit/468f117cd599ee79b54ebc2b839bd4f9af1cd850))
* **config:** keep prettier off the published registry files ([5386324](https://github.com/uwumilabs/react-native-consumet/commit/53863248917788d3a630d16180a68efb8f6d2eea))
* make ES2022 dist safe for Hermes runtime evaluation ([e32bb18](https://github.com/uwumilabs/react-native-consumet/commit/e32bb18d6ff64e57319634d0b64456c5d3779820))
* **managers:** load each extension once and give extensions a fetch that reports http errors ([76dcc7b](https://github.com/uwumilabs/react-native-consumet/commit/76dcc7b917f83a6dd39bb6f967df2e8210ff9dea))
* **meta:** deprecate myanimelist and fix its dates, titles and empty episodes ([75e6b91](https://github.com/uwumilabs/react-native-consumet/commit/75e6b91d6a7f023fdcf54dda5fdff3b49a42ec95))
* **meta:** drop the anify fallbacks and throw typed meta errors from anilist and mal ([dba0f9e](https://github.com/uwumilabs/react-native-consumet/commit/dba0f9ee18907f3736213e190f7a811a13d1cb30))
* **meta:** fetch tmdb seasons together so one failing season keeps the rest ([c772d07](https://github.com/uwumilabs/react-native-consumet/commit/c772d078d9948128c4bd9e09386e03bf6fa6fa00))
* **meta:** throw typed meta errors from tmdb instead of bare errors ([39c4901](https://github.com/uwumilabs/react-native-consumet/commit/39c490186b4095d6f7fd20f5a99d30b596bf089a))
* **meta:** url-encode the tmdb and mal search queries ([0ce822c](https://github.com/uwumilabs/react-native-consumet/commit/0ce822cb6d49f8de864183aad9662904f062ed7e))
* **meta:** warn when tmdb falls back to the shared api key ([128dde8](https://github.com/uwumilabs/react-native-consumet/commit/128dde8b9d44f3053a9fdc7e11613d83eaa61efe))
* **native:** make android and ios follow one native module contract ([b9768ea](https://github.com/uwumilabs/react-native-consumet/commit/b9768ea37143872a5ba01eef6a5f807d2cf9841d))
* **native:** stop exposing webview debugging, cookies and app web data ([d7e30f5](https://github.com/uwumilabs/react-native-consumet/commit/d7e30f5e62c205e6698c4ee544f74aaddf385ce2))
* **netflixmirror:** keep the native cookie jar out of mirror requests ([848853c](https://github.com/uwumilabs/react-native-consumet/commit/848853c4c47dfb5db0494f9a870cc32c07da63e1))
* **packaging:** make get-random-values a peer and fix podspec, files and release config ([525ba9c](https://github.com/uwumilabs/react-native-consumet/commit/525ba9c06531e3de24ac97a0e09d34812afe5f97))
* **registry:** compile block scoping out of registry bundles for hermes ([78ac78b](https://github.com/uwumilabs/react-native-consumet/commit/78ac78b71a87b68378c2dc7052ebf6b695d9c3e4))
* **release:** hoist the conventionalcommits preset the changelog plugin needs ([32e8c30](https://github.com/uwumilabs/react-native-consumet/commit/32e8c30fe848ca9241dc4c881db0704ce79c085c))
* **utils:** make the url polyfill follow the whatwg url standard ([cecce96](https://github.com/uwumilabs/react-native-consumet/commit/cecce9612ea14088ab84fb161539e145edca1103))
* **vegamovies:** move to new1.vegamovies.lease ([1dbb53e](https://github.com/uwumilabs/react-native-consumet/commit/1dbb53e74263a1f9ea677eb6103f80e9e52fe81c))

### Performance Improvements

* **native:** cache the synchrony script and pin its sha-256 ([eb9c072](https://github.com/uwumilabs/react-native-consumet/commit/eb9c072351af4a1591f66c6b4cb1e8f99bf66474))

### Code Refactoring

* **native:** remove the template multiply method and unused gradle deps ([cd28adb](https://github.com/uwumilabs/react-native-consumet/commit/cd28adbdc33307169c1eac082cebb962270079d9))
* **providers:** remove dead providers and flag the two unverified ones ([82e2c8e](https://github.com/uwumilabs/react-native-consumet/commit/82e2c8e4f4d08f372dc3460f9336ee3b196b22b1))

## [1.6.0](https://github.com/uwumilabs/react-native-consumet/compare/v1.5.0...v1.6.0) (2026-10-09)


### Features

* add server selection, META providers, debug player, and HLS fix ([6586ec4](https://github.com/uwumilabs/react-native-consumet/commit/6586ec47dc3577bc23ccb8199cb0848dfb5ddf35))
* **anikoto:** enhance episode extraction with additional attributes ([5d54e72](https://github.com/uwumilabs/react-native-consumet/commit/5d54e72095498aaab94f8458c2f8f03aae585e50))
* **ios:** implement all native module methods with wkwebview/urlsession ([636bf62](https://github.com/uwumilabs/react-native-consumet/commit/636bf6235719229e09b1dc601ce2e8e8414d2521))
* upgrade rn version to 0.87 and js compilation to es2022 ([ce84220](https://github.com/uwumilabs/react-native-consumet/commit/ce8422029ebf99e4aeebebe9478c00777e3cd1c3))


### Bug Fixes

* **security:** add SHA-256 integrity and factoryName validation for dynamic code execution ([1b63ebb](https://github.com/uwumilabs/react-native-consumet/commit/1b63ebbf44673637733885aabd44da3dd96fb04e))

## [1.5.0](https://github.com/uwumilabs/react-native-consumet/compare/v1.4.0...v1.5.0) (2026-09-13)


### Features

* add anineko and reanime anime providers, flixcloud extractor, and cryptojs context support ([bfaf48f](https://github.com/uwumilabs/react-native-consumet/commit/bfaf48f94851634edeef5c121fa96111683a48f8))
* improve apps ([8160a71](https://github.com/uwumilabs/react-native-consumet/commit/8160a7186516d48627278dcf17abd1d907e6f755))

## [1.4.0](https://github.com/uwumilabs/react-native-consumet/compare/v1.3.1...v1.4.0) (2026-09-12)


### Features

* implememnt anikoto ([94b258b](https://github.com/uwumilabs/react-native-consumet/commit/94b258b5b079886f9a36d035a9ecce4a0900f5af))
* implement vegamovies ([9035b9c](https://github.com/uwumilabs/react-native-consumet/commit/9035b9cd0148411053092e53700f45dde1ca5391))

## [1.3.1](https://github.com/uwumilabs/react-native-consumet/compare/v1.3.0...v1.3.1) (2026-05-30)


### Bug Fixes

* json again ([630fa9c](https://github.com/uwumilabs/react-native-consumet/commit/630fa9c920db2201e62e58243ab197ca64974744))
* **json:** correct the name of zoro ([4a02336](https://github.com/uwumilabs/react-native-consumet/commit/4a02336ab78586411deb8294ccf2183cd6ba37fb))

## [1.3.0](https://github.com/uwumilabs/react-native-consumet/compare/v1.2.3...v1.3.0) (2026-04-19)


### Features

* **aniwatchtv:** introduce new anime provider ([9304d71](https://github.com/uwumilabs/react-native-consumet/commit/9304d71994f263d512807e07b499964245e29968))


### Bug Fixes

* **meta:** add aniwatchtv in anilist ([266577a](https://github.com/uwumilabs/react-native-consumet/commit/266577ace0802346d69b50c219f9da1007e0b82e))

## [1.2.3](https://github.com/uwumilabs/react-native-consumet/compare/v1.2.2...v1.2.3) (2026-02-26)


### Bug Fixes

* **animepahe:** correct logo url ([8f310eb](https://github.com/uwumilabs/react-native-consumet/commit/8f310eb534790064a5c388378c1c2caaef3b782e))
* language fallback in megaup ([af114c8](https://github.com/uwumilabs/react-native-consumet/commit/af114c85502ca35d79edde08e66d66664c2e2cc1))



## <small>1.2.2 (2025-11-08)</small>

* fix(tmdb): add release date validation before year filtering ([5c5e239](https://github.com/uwumilabs/react-native-consumet/commit/5c5e239))

## <small>1.2.1 (2025-11-07)</small>

* fix: update repository url's to reflect new ownership [skip ci] ([df7fe91](https://github.com/uwumilabs/react-native-consumet/commit/df7fe91))
* fix(multimovies): fix multimovies fetch calls ([38e53c5](https://github.com/uwumilabs/react-native-consumet/commit/38e53c5))
* refactor(multimovies): implement multimovies factory function ([ef13f39](https://github.com/uwumilabs/react-native-consumet/commit/ef13f39))
* refactor(yflix): implement yflix as a factory function ([5cc0914](https://github.com/uwumilabs/react-native-consumet/commit/5cc0914))

## 1.2.0 (2025-11-01)

* feat(megaup): improve extractor with multi-quality and better source handling ([17ca0e8](https://github.com/uwumilabs/react-native-consumet/commit/17ca0e8))
* refactor: move example from apps/bare-example to apps/ ([afa8059](https://github.com/uwumilabs/react-native-consumet/commit/afa8059))
* refactor(animekai): implement animekai factory function and megaup factory function ([76a059a](https://github.com/uwumilabs/react-native-consumet/commit/76a059a))
* fix(megaup|animekai): update megaup extractor to use external api for iframe decoding ([cbc8dc3](https://github.com/uwumilabs/react-native-consumet/commit/cbc8dc3))
* chore: bump example app versions and add new servers in multistream ([47837ee](https://github.com/uwumilabs/react-native-consumet/commit/47837ee))
* chore(docs): update readme [skip ci] ([797f18f](https://github.com/uwumilabs/react-native-consumet/commit/797f18f))
* fix(megacloud): quality and url parsing in megacloud extractor ([bfdb929](https://github.com/uwumilabs/react-native-consumet/commit/bfdb929))

## 1.1.0 (2025-10-10)

* feat: multi-quality support and add  property in registry ([1f9344a](https://github.com/uwumilabs/react-native-consumet/commit/1f9344a))
* feat(extractor): enhance extractor-manager to support dynamic server names ([02549cc](https://github.com/uwumilabs/react-native-consumet/commit/02549cc))

## <small>1.0.3 (2025-10-05)</small>

* fix: resolve circular dependency issues ([6ca2897](https://github.com/uwumilabs/react-native-consumet/commit/6ca2897))
* refactor: code format [skip ci] ([2d0e80d](https://github.com/uwumilabs/react-native-consumet/commit/2d0e80d))

## <small>1.0.2 (2025-10-01)</small>

* refactor(provider-manager): attach provider prototypes for instance validation ([3045b95](https://github.com/uwumilabs/react-native-consumet/commit/3045b95))

## <small>1.0.1 (2025-09-29)</small>

* refactor(provider-maps): implement lazy loading for providers to avoid circular dependencies ([85f1022](https://github.com/uwumilabs/react-native-consumet/commit/85f1022))

## 1.0.0 (2025-09-28)

* refactor(provider-manager): enhance extension loading and type safety ([2487946](https://github.com/uwumilabs/react-native-consumet/commit/2487946))

## 1.0.0-rc.2 (2025-09-19)

* Fix/animpahe (#2) ([23b2295](https://github.com/uwumilabs/react-native-consumet/commit/23b2295)), closes [#2](https://github.com/uwumilabs/react-native-consumet/issues/2)
* feat: add 111Movies & AnimeSuge; fix MultiStream ([dcbbadf](https://github.com/uwumilabs/react-native-consumet/commit/dcbbadf))
* fix: clean episodeId in server fetching of zoro ([dd3e0ff](https://github.com/uwumilabs/react-native-consumet/commit/dd3e0ff))
* fix: update branch references in extension registry to point to 'main' ([4dae325](https://github.com/uwumilabs/react-native-consumet/commit/4dae325))

## 1.0.0-rc.1 (2025-08-18)

* refactor: add registry script, and remove circular deps ([b5b1dda](https://github.com/uwumilabs/react-native-consumet/commit/b5b1dda))
* chore: update extractor main urls to point to the main branch [skip ci] ([acc9e03](https://github.com/uwumilabs/react-native-consumet/commit/acc9e03))
* docs: improve pr and bug report templates ([f7ddfcf](https://github.com/uwumilabs/react-native-consumet/commit/f7ddfcf))

## 1.0.0-rc.0 (2025-08-18)

* refactor(core): introduce extension system with ProviderManager & ExtractorManager, remove deprecate ([b2d7aa4](https://github.com/uwumilabs/react-native-consumet/commit/b2d7aa4)), closes [#1](https://github.com/uwumilabs/react-native-consumet/issues/1)
* refactor(proxy): remove proxy and other deprecated exports ([90b4794](https://github.com/uwumilabs/react-native-consumet/commit/90b4794))
* feat(build): added a build command to make dist folder ([f571c53](https://github.com/uwumilabs/react-native-consumet/commit/f571c53))
* feat(utils): create some ready to use utilities and clean all the files ([c1b7c58](https://github.com/uwumilabs/react-native-consumet/commit/c1b7c58))
* feat(zoro): first provider towards extension archiecture ([b949f71](https://github.com/uwumilabs/react-native-consumet/commit/b949f71))
* chore(providers): remove deprecated movie and news providers ([c88baa9](https://github.com/uwumilabs/react-native-consumet/commit/c88baa9))
* fix(multimovies): proxy network calls of multimovies via cloudflare based proxy ([8bb45ad](https://github.com/uwumilabs/react-native-consumet/commit/8bb45ad))
* refactor(himovies, tmdb): get release date in search from fetchMediaInfo and fix tmdb mapping ([c1c9328](https://github.com/uwumilabs/react-native-consumet/commit/c1c9328))

## 0.9.0 (2025-07-28)

* fix(ci): fix type definition error in vidcloud.ts that caused ci to fail ([8897ee3](https://github.com/uwumilabs/react-native-consumet/commit/8897ee3))
* fix(megacloud): improve the scraper and remove log statements ([5c3a58c](https://github.com/uwumilabs/react-native-consumet/commit/5c3a58c))
* feat(multistream): implement multistream provider ([0a0cd6b](https://github.com/uwumilabs/react-native-consumet/commit/0a0cd6b))
* fix(anilist | animepahe): fix the normalized episode merging issue ([37a8615](https://github.com/uwumilabs/react-native-consumet/commit/37a8615))

## 0.8.0 (2025-07-07)

* feat(provider): update anime and movie providers ([7b898ba](https://github.com/uwumilabs/react-native-consumet/commit/7b898ba))

## <small>0.7.2 (2025-06-23)</small>

* feat: add Luffy extractor, AnimeOwl provider, and deobfuscator; fix Megacloud/Vidcloud ([08ba6bd](https://github.com/uwumilabs/react-native-consumet/commit/08ba6bd))

## <small>0.7.1 (2025-06-10)</small>

* fix(multimovies | streamwish): add referrer in stremwish to get the hls links properly ([5671864](https://github.com/uwumilabs/react-native-consumet/commit/5671864))

## 0.7.0 (2025-05-08)

* feat: refactor getSources method, add HiMovies provider, and update MegaUp decryption ([22efedb](https://github.com/uwumilabs/react-native-consumet/commit/22efedb))

## <small>0.6.2 (2025-05-01)</small>

* feat: add cookie fetching methods for netflix-mirror requests ([87fef82](https://github.com/uwumilabs/react-native-consumet/commit/87fef82))
* feat(netflixmirror): new movie provider ([5292387](https://github.com/uwumilabs/react-native-consumet/commit/5292387))

## <small>0.6.1 (2025-04-27)</small>

* fix(anilist | animepahe): enhance episode merging with release date handling ([a2a897a](https://github.com/uwumilabs/react-native-consumet/commit/a2a897a))

## 0.6.0 (2025-04-26)

* feat: enhance ddos guard with webview cookie retrieval and update animepahe integration ([c4d568a](https://github.com/uwumilabs/react-native-consumet/commit/c4d568a))
* feat: implement DDoS guard bypass functionality and update related modules and fixing id in tmdb ([f630451](https://github.com/uwumilabs/react-native-consumet/commit/f630451))

## 0.5.0 (2025-04-22)

* feat: update URL logic for consumet-android, multimovies, zoro ([a1471fe](https://github.com/uwumilabs/react-native-consumet/commit/a1471fe))

## <small>0.4.3 (2025-04-20)</small>

* feat(animepahe): download links in animepahe ([88712a0](https://github.com/uwumilabs/react-native-consumet/commit/88712a0))
* fix(anilist): ani-zip interface and some fixings in lib ([9cd439c](https://github.com/uwumilabs/react-native-consumet/commit/9cd439c))

## <small>0.4.2 (2025-04-18)</small>

* fix(anilist): optimize episode merging ([bf2df23](https://github.com/uwumilabs/react-native-consumet/commit/bf2df23))
* docs: update readme [skip ci] ([0b2c15b](https://github.com/uwumilabs/react-native-consumet/commit/0b2c15b))

## <small>0.4.1 (2025-04-16)</small>

* fix: enhance megaup extractor with new kaicodex integration ([ccafb22](https://github.com/uwumilabs/react-native-consumet/commit/ccafb22))

## v0.4.0 (2025-04-13)

* feat: use cdn for js assets in consumet-module to decrease the size of bundle ([0aea2e4](https://github.com/uwumilabs/react-native-consumet/commit/0aea2e4))

## v0.3.0 (2025-04-12)

* feat(meta): improve fetchEpisodesListById and tmdb, code format, update base url of zoro ([85d3da7](https://github.com/uwumilabs/react-native-consumet/commit/85d3da7))
* feat(prettier): improve dx [skip ci] ([0e950c4](https://github.com/uwumilabs/react-native-consumet/commit/0e950c4))
* fix(streamwish,megaup): fix streamwish and megaup extractors and remove old providers ([955bbe9](https://github.com/uwumilabs/react-native-consumet/commit/955bbe9))

## <small>v0.2.2 (2025-04-04)</small>

* fix(megaup): fix megaup decoding logic ([e761ffe](https://github.com/uwumilabs/react-native-consumet/commit/e761ffe))
* chore: migrate example to bare-example structure and remove deprecated files ([fbd25b4](https://github.com/uwumilabs/react-native-consumet/commit/fbd25b4))

## <small>v0.2.1 (2025-04-02)</small>

* chore(eslint | tsconfig): add jest.setup.js to ignored files, update exclude list ([3779930](https://github.com/uwumilabs/react-native-consumet/commit/3779930))
* first commit ([d8ef215](https://github.com/uwumilabs/react-native-consumet/commit/d8ef215))
* chore(jest): refine config and setup, update issue and PR templates ([622d6ef](https://github.com/uwumilabs/react-native-consumet/commit/622d6ef))
* chore(package): add infile option for conventional changelog ([f8780b2](https://github.com/uwumilabs/react-native-consumet/commit/f8780b2))
* fix(types): fix all type issues and add docs and test ([f30fb53](https://github.com/uwumilabs/react-native-consumet/commit/f30fb53))

## v0.2.0 (2025-04-02)

* chore(jest): refine config and setup, update issue and PR templates ([622d6ef](https://github.com/uwumilabs/react-native-consumet/commit/622d6ef))
* chore(package): add infile option for conventional changelog ([bd2b6ed](https://github.com/uwumilabs/react-native-consumet/commit/bd2b6ed))
* fix(types): fix all type issues and add docs and test ([f30fb53](https://github.com/uwumilabs/react-native-consumet/commit/f30fb53))
* first commit ([d8ef215](https://github.com/uwumilabs/react-native-consumet/commit/d8ef215))
