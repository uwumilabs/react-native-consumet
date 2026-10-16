This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Registry tab: load modes

The **Registry** tab loads its anime and movie providers through one `ProviderManager`, built from the
bundled `ExtensionRegistry`. Its **Load from** toggle picks where the provider code comes from:

- **Registry** (default) is the path apps use. `getAnimeProvider` / `getMovieProvider` fetch the
  entry's `main` URL (`registry/extensions/<id>/<version>.js` on GitHub `main`). They check the code
  against the entry's `sha256` before running it, and refuse entries that need a newer library. This
  check can't be skipped.
- **Local dist** is for working on a provider before it's published. It runs the code in
  `src/registry/local-dist-map.ts` with `executeProviderCode` and checks it against the same
  `sha256`, so a stale map shows up as an integrity mismatch. You can then choose
  **Run unverified**, and the screen shows **integrity check SKIPPED** for that load.

In both modes, providers load their extractors through the manager's shared `ExtractorManager`, which
fetches and verifies the registry version and falls back to the bundled extractor.

Under the header, the screen shows what it loaded: the version, the mode, and the verified hash and
source URL. When a load fails, it shows the error and what to do about it:

| Error | Meaning |
| --- | --- |
| Integrity error (`IntegrityError`) | The code doesn't match the registry `sha256`, so it didn't run. In Registry mode, a published file changed, and that must never happen: publish a new version instead. In Local dist mode, the map is stale: regenerate it (below). |
| Registry error, update required (`RegistryError` with `updateRequired`) | The entry (or registry) needs a newer `react-native-consumet` than the app has. |
| Registry error (`RegistryError`) | The registry entry is invalid. |
| Not found (404) | `main` URLs point at `refs/heads/main`. A version that is committed but not yet pushed to `main` (or was pruned from it) isn't there. Push it, or use **Local dist**. |
| Network error | GitHub couldn't be reached, or returned another HTTP error. |

## Regenerating the local dist map

The map holds each registry entry's `distFile` (the build output its `sha256` is computed from):

```sh
yarn build                         # from the repo root: rebuild dist/bundles
node scripts/prepare-registry.js   # publish changed entries (bump their version) and refresh sha256
yarn example gen:local-dist        # rewrite apps/src/registry/local-dist-map.ts
```

If you skip `prepare-registry`, Local dist mode reports the new code as an integrity mismatch, because
the registry still has the old hash. Use **Run unverified** while you iterate.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
