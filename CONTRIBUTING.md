# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory (`react-native-consumet`).
- Example applications in the `apps/` directory .

To get started with the project, run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development.

The example applications (`apps/) demonstrate usage of the library. You need to run them to test any changes you make.

They are configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example apps. Changes to the library's JavaScript code will be reflected in the example apps without a rebuild, but native code changes will require a rebuild of the example apps.

If you want to use Android Studio or XCode to edit the native code, you can open the `apps/android` or `apps/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `apps/ios/ConsumetExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > react-native-consumet`.

To edit the Java or Kotlin files, open `apps/android` in Android studio and find the source files at `react-native-consumet` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager (from the root of the monorepo, for `bare-example`):

```sh
yarn workspace example:bare start
```

To run the `bare-example` app on Android:

```sh
yarn workspace example:bare android
```

To run the `bare-example` app on iOS:

```sh
yarn workspace example:bare ios
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

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

### Adding New Providers

If you're looking to contribute by adding a new content provider (e.g., for anime, movies, manga, or light novels), please refer to our detailed guide:

- [Adding a New Provider to react-native-consumet](./docs/guides/adding-new-provider.md)

### Commit message convention

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
yarn release
```

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
