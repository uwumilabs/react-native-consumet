<h1 align="center">react-native-consumet</h1>

<h2>LIGHT_NOVELS</h2>

By using `LIGHT_NOVELS` category you can interact with the light novel providers. And have access to the light novel providers methods. Which allows you to search for light novels, get the light novel information, get the light novel chapters with text content to read.

The bundled extension registry has no light novel providers yet, so use the bundled classes below. A registry that lists light novel providers loads them with `manager.getProvider('light-novels', id)` (see [Extension Integration](../extension-integration.md#providermanager)).

```ts
import { LIGHT_NOVELS } from 'react-native-consumet';

// Any class from the list below
const readlightnovels = new LIGHT_NOVELS.ReadLightNovels();
```

## Light Novels Providers List

This list is in alphabetical order.

- [NovelUpdates](../providers/light-novels/novelupdates.md) (`LIGHT_NOVELS.NovelUpdates`)
- [ReadLightNovels](../providers/light-novels/readlightnovels.md) (`LIGHT_NOVELS.ReadLightNovels`)

<p align="end">(<a href="../README.md">back to table of contents</a>)</p>
