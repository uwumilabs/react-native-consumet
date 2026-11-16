import { createAnimePahe } from './animepahe/create-animepahe';
import { createZoro } from './zoro/create-zoro';
import { createAniKoto } from './anikoto/create-anikoto';
import { createReanime } from './reanime/create-reanime';
import { createAniNeko } from './anineko/create-anineko';
export declare const ANIME: {
    AnimePahe: import("../provider-class").ProviderClass<typeof createAnimePahe, typeof import("../..").AnimeParser>;
    createAnimePahe: typeof createAnimePahe;
    Zoro: import("../provider-class").ProviderClass<typeof createZoro, typeof import("../..").AnimeParser>;
    createZoro: typeof createZoro;
    AniKoto: import("../provider-class").ProviderClass<typeof createAniKoto, typeof import("../..").AnimeParser>;
    createAniKoto: typeof createAniKoto;
    ReAnime: import("../provider-class").ProviderClass<typeof createReanime, typeof import("../..").AnimeParser>;
    createReanime: typeof createReanime;
    AniNeko: import("../provider-class").ProviderClass<typeof createAniNeko, typeof import("../..").AnimeParser>;
    createAniNeko: typeof createAniNeko;
};
//# sourceMappingURL=index.d.ts.map