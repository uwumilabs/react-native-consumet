# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory (`react-native-consumet`).
- The example app in the `apps/` directory (`react-native-consumet-example`).

To get started with the project, run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

The example app (`apps/`) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or XCode to edit the native code, you can open the `apps/android` or `apps/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `apps/ios/ConsumetExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > Consumet`.

To edit the Java or Kotlin files, open `apps/android` in Android studio and find the source files at `react-native-consumet` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager (from the root of the monorepo):

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "ConsumetExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typecheck
yarn lint
```

`yarn lint` only reports problems. To fix formatting and other fixable errors, run the following:

```sh
yarn lint:fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

`yarn test` runs the offline unit tests under `test/unit/`. `yarn test:live` also runs the suites that call the real provider sites.

The Android native module has its own tests. Run them from `apps/android`, the second one on a connected device or emulator:

```sh
./gradlew :react-native-consumet:testDebugUnitTest
./gradlew :react-native-consumet:connectedDebugAndroidTest
```

#### Updating Synchrony

`deobfuscateScript` downloads the Synchrony deobfuscator once, checks it against a pinned SHA-256, and caches it in memory and on disk. To move to another Synchrony version, change the URL and the SHA-256 together, in `android/src/main/java/com/consumet/Synchrony.kt` (`SCRIPT_URL`, `SCRIPT_SHA256`) and `ios/RCConsumetSynchronyCache.m` (`kSynchronyURL`, `kSynchronySHA256`). Then check that both platforms pin the same values and that the URL serves that hash:

```sh
LIVE_TESTS=1 npx jest test/unit/native-synchrony-cache
```

### Testing in the example app

The example app's **Registry** tab loads anime and movie providers through a `ProviderManager` built from the bundled registry. Its **Load from** toggle picks where the code comes from:

- **Local dist**, for a provider or change that isn't published yet. Rebuild, publish the entry locally and regenerate the app's map of bundles, then load it in the app:

  ```sh
  yarn build
  node scripts/prepare-registry.js
  yarn example gen:local-dist
  ```

  The app still checks the code against the entry's `sha256`, so a stale map shows an integrity mismatch.

- **Registry**, the path real apps use, once the new version is on `main`: it fetches the entry's `main` URL and verifies its hash. Before that, it reports a 404.

See [`apps/README.md`](./apps/README.md) for the errors each mode shows.

### Adding New Providers

If you're looking to contribute by adding a new content provider (e.g., for anime, movies, manga, or light novels), please refer to our detailed guide:

- [Adding a New Provider to react-native-consumet](./docs/guides/adding-new-provider.md)

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. update a dependency.
- `style`, `perf`, `ci`: formatting, performance improvements and CI changes.

Write the message as `type(scope): subject`, for example `fix(animepahe): read the new episode list`. The scope and subject are lower-case, the subject is at least 10 characters with no trailing period, and body lines are at most 100 characters. The `commit-msg` hook checks this with commitlint (`commitlint.config.js`).

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

The pre-commit hook:

1. Runs ESLint (with `--fix`) and Prettier on the staged files only, through [lint-staged](https://github.com/lint-staged/lint-staged). Their fixes are staged; ESLint errors stop the commit.
2. Type-checks the project (`yarn typecheck`).
3. When the commit stages changes under `src/` or `scripts/` (or the build config), rebuilds `dist/` from the staged files, publishes changed registry entries with `scripts/prepare-registry.js`, and stages `dist/`, the new files under `registry/` and `src/extension-registry.json`. Unstaged edits are left out of the build. If a registry bundle changed without a `version` bump, the commit stops; see [Adding a New Provider](./docs/guides/adding-new-provider.md#step-4-add-to-extension-registryjson).

The hook doesn't run the tests; run `yarn test` yourself.

CI runs `yarn lint` (plain `eslint .`) and `yarn typecheck`, rebuilds `dist/` and checks it and the registry against the rebuild, builds the package, and builds the example app for Android and iOS. When the registry or the signing keys change on `main`, the Sign registry workflow signs the registry, after a maintainer approves the run (see below).

### Registry signing (maintainers)

Apps that download the registry verify it with the ed25519 public keys bundled in the library (see the [Security Model](./docs/security.md#6-signed-registry-downloads)). The Sign registry workflow (`.github/workflows/sign-registry.yml`) signs the exact bytes of `src/extension-registry.json` and commits `src/extension-registry.json.sig` to `main`. Two scripts support it:

- `yarn registry:keygen` generates a key pair, adds the public key to `src/registry-signing-keys.ts` and prints the private key once. It never writes the private key to disk.
- `yarn registry:sign` signs the registry with the private keys in the `REGISTRY_SIGNING_KEY` environment variable and writes the `.sig` file. It refuses a key whose public key isn't listed in `src/registry-signing-keys.ts`. CI runs it; you rarely need to.

One-time setup:

1. Run `yarn registry:keygen`, and commit `src/registry-signing-keys.ts` with the new public key.
2. In the GitHub repository settings, create the `registry-signing` environment. Give it a required reviewer and limit it to the `main` branch. The reviewer is the trust boundary: nothing gets signed without their approval.
3. Add the private key the script printed as the environment secret `REGISTRY_SIGNING_KEY` (or run `gh secret set REGISTRY_SIGNING_KEY --env registry-signing`). Then clear your terminal's scrollback.
4. Push to `main`, and approve the Sign registry run. It commits the signature.
5. Release the library. Apps only trust the keys bundled in the version they ship.

After every registry change that reaches `main`, approve the Sign registry run. Until then the signature is stale: `yarn registry:check` notes it, and apps that verify downloads keep their previous registry.

To rotate keys, run `yarn registry:keygen` again and store the new private key as `REGISTRY_SIGNING_KEY_2`. CI signs with both keys, so apps that only trust the old one keep verifying. Once no supported release needs the old key, remove it from `src/registry-signing-keys.ts`, release, and delete its secret. Remove a leaked key and its secret at once.

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
yarn release
```

CI doesn't run the live suites, so run the ones for providers whose request path changed since the last release before you publish. For the next release that includes MangaDex and MangaKakalot, whose requests now go through the library's `defaultAxios`:

```sh
LIVE_TESTS=1 npx jest test/manga/mangadex test/manga/mangakakalot
```

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint (no fixes).
- `yarn lint:fix`: lint files with ESLint and apply fixes.
- `yarn build`: build `dist/`, including one bundle per registry entry.
- `yarn registry:check`: check the registry against `dist/` and the published files under `registry/`, and note whether its signature is current.
- `yarn registry:prune`: list published registry versions the retention rule allows deleting (`--delete` removes them).
- `yarn registry:keygen`: generate a registry signing key (maintainers, see above).
- `yarn registry:sign`: sign the registry with the keys in `REGISTRY_SIGNING_KEY` (CI runs it).
- `yarn test`: run the offline unit tests with Jest; `yarn test:live` also runs the live suites.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.
- `yarn example gen:local-dist`: regenerate the example app's local dist map after `yarn build`.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
