import type { IProviderStats, ProviderCapabilities } from './types';

abstract class BaseProvider {
  /** What the provider supports; meta providers read it instead of the provider's class. */
  capabilities?: ProviderCapabilities;

  abstract readonly name: string;

  protected abstract readonly baseUrl: string;

  /** [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) code(s) of the site's language */
  protected readonly languages: string[] | string = 'en';

  /** `true` when the site has **only** NSFW content */
  readonly isNSFW: boolean = false;

  /** URL (not a data URL) of the site's logo, 128x128px preferred */
  protected readonly logo: string =
    'https://png.pngtree.com/png-vector/20210221/ourmid/pngtree-error-404-not-found-neon-effect-png-image_2928214.jpg';

  /** Where the class is exported, e.g. `MANGA.MangaDex` (case sensitive) */
  protected abstract readonly classPath: string;

  /** `false` when the site is down or the provider no longer works */
  readonly isWorking: boolean = true;

  get toString(): IProviderStats {
    return {
      name: this.name,
      baseUrl: this.baseUrl,
      lang: this.languages,
      isNSFW: this.isNSFW,
      logo: this.logo,
      classPath: this.classPath,
      isWorking: this.isWorking,
    };
  }
}

export default BaseProvider;
