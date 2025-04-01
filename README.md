# react-native-consumet

React Native library providing access to entertainment media information (anime, movies, manga, etc.) from multiple sources, adapting the Consumet API for mobile applications.

## Installation

```sh
npm install react-native-consumet
# or yarn add react-native-consumet
```

> [!IMPORTANT]  
> This library has been primarily tested on Android devices. iOS testing is currently limited due to lack of MacBook access. Some providers (like Zoro, FlixHQ) may not work correctly on iOS. Contributions from developers with iOS testing capabilities are greatly appreciated!

## Usage

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

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
