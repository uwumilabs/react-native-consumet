# react-native-consumet

React Native library providing access to entertainment media information (anime, movies, manga, etc.) from multiple sources, adapting the [Consumet](https://github.com/consumet/consumet.ts) Node Package for mobile applications.

<a href="https://www.npmjs.com/package/react-native-consumet">
  <img src="https://img.shields.io/npm/v/react-native-consumet" alt="npm version" />
</a>
<a href="https://github.com/uwumilabs/react-native-consumet/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/uwumilabs/react-native-consumet" alt="license" />
</a>
<a href="https://github.com/uwumilabs/react-native-consumet/actions/workflows/ci.yml">
  <img
    src="https://img.shields.io/github/actions/workflow/status/uwumilabs/react-native-consumet/ci.yml?label=ci"
    alt="CI Workflow Status"
  />
</a>
<a href="https://discord.gg/n7xVPxbG4R">
  <img
    src="https://img.shields.io/discord/1387063063223599265?color=7289da&label=discord&logo=discord&logoColor=7289d"
    alt="discord"
  />
</a>

## 📚 Documentation

**New to React Native Consumet?** Start here:

- **[📖 Getting Started Guide](./docs/guides/getting-started.md)** - Complete setup and basic usage
- **[🔧 Extension Integration](./docs/extension-integration.md)** - Using the powerful extension system (Recommended)
- **[📋 Full Documentation](./docs/README.md)** - Complete documentation index

### Provider-Specific Guides

- **[🎬 Anime Providers](./docs/guides/anime.md)** - Anime streaming providers
- **[🎥 Movie Providers](./docs/guides/movies.md)** - Movie and TV show providers  
- **[📚 Manga Providers](./docs/guides/manga.md)** - Manga reading providers
- **[📖 Light Novel Providers](./docs/guides/light-novels.md)** - Light novel providers
- **[🔍 Meta Providers](./docs/guides/meta.md)** - Metadata and search providers

## Installation

```sh
npm install react-native-consumet
# or yarn add react-native-consumet
```

> [!IMPORTANT]  
> This library has been primarily tested on Android devices. iOS testing is currently limited due to lack of MacBook access. Some providers (like Zoro, FlixHQ) may not work correctly on iOS. Contributions from developers with iOS testing capabilities are greatly appreciated!

> [!NOTE]
> This library is actively maintained but may occasionally lag behind the latest Consumet API changes. The project is in early development and some features may be incomplete or require refinement. If you encounter any issues or have suggestions, please open an issue on GitHub.

## Quick Start

```js
import { ANIME } from 'react-native-consumet';

// Initialize the provider (e.g., Zoro)
const zoro = new ANIME.Zoro();

// Example usage in a component
const MyAnimeComponent = () => {
  const [animeList, setAnimeList] = useState([]);

  const fetchAnime = async () => {
    try {
      const results = await zoro.search('one piece');
      setAnimeList(results.results);
    } catch (error) {
      console.error('Error fetching anime:', error);
    }
  };

  return (
    // Your component JSX
  );
};
```

> **💡 Want more examples?** Check out our [📖 Getting Started Guide](./docs/guides/getting-started.md) for detailed examples and best practices!

> **🚀 Using Extensions?** We recommend the [Extension System](./docs/extension-integration.md) for better performance and unified API access.

## ✨ Features

- **🎬 Multi-Provider Support**: Anime, Movies, Manga, Light Novels, and more
- **🔧 Extension System**: Dynamic provider loading with unified API
- **📱 React Native Optimized**: Built specifically for mobile applications
- **🔍 Cross-Provider Search**: Search across multiple providers simultaneously
- **📚 Comprehensive Documentation**: Detailed guides for every use case
- **🤝 Active Community**: Open source with regular updates

## 🤝 Contributing

We welcome contributions! Please check out:

- **[🤝 Contributing Guide](CONTRIBUTING.md)** - Detailed contribution guidelines
- **[📁 Provider Documentation](./docs/providers/)** - How to add new providers

## 📄 License

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
