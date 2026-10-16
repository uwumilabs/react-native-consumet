/**
 * WHATWG URL and URLSearchParams for Hermes, whose global URL support is incomplete.
 *
 * Extensions get these as `ctx.PolyURL` / `ctx.PolyURLSearchParams`, so every provider and extractor
 * inherits their behaviour. The parser follows the URL Standard (https://url.spec.whatwg.org/) state
 * machine, and test/unit/url-polyfill.test.ts checks it against Node's URL. It never uses a global URL.
 *
 * Known gap: hosts are mapped with NFKC, lower-casing and punycode instead of the full UTS #46 table,
 * so exotic internationalised domain names can differ from a browser.
 */
type Nullable<T> = T | null;
export declare class URLSearchParams implements Iterable<[string, string]> {
    private _list;
    private _url;
    constructor(init?: string | Record<string, string> | Array<[string, string]> | URLSearchParams);
    private _update;
    append(name: string, value: string): void;
    set(name: string, value: string): void;
    get(name: string): Nullable<string>;
    getAll(name: string): string[];
    has(name: string, value?: string): boolean;
    delete(name: string, value?: string): void;
    forEach(cb: (value: string, name: string, self: URLSearchParams) => void, thisArg?: any): void;
    toString(): string;
    sort(): void;
    toJSON(): string;
    clone(): URLSearchParams;
    get size(): number;
    clear(): void;
    entries(): IterableIterator<[string, string]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    [Symbol.iterator](): IterableIterator<[string, string]>;
}
export declare class URL {
    private _r;
    searchParams: URLSearchParams;
    /** @throws {TypeError} if `input` (resolved against `base`) or `base` is not a valid URL. */
    constructor(input: string, base?: string | URL);
    private _resetSearchParams;
    static canParse(url: string, base?: string | URL): boolean;
    static parse(url: string, base?: string | URL): URL | null;
    get href(): string;
    set href(val: string);
    get protocol(): string;
    set protocol(val: string);
    get username(): string;
    set username(v: string);
    get password(): string;
    set password(v: string);
    get host(): string;
    set host(v: string);
    get hostname(): string;
    set hostname(v: string);
    get port(): string;
    set port(v: string);
    get pathname(): string;
    set pathname(v: string);
    get search(): string;
    set search(v: string);
    get hash(): string;
    set hash(v: string);
    get origin(): string;
    toString(): string;
    toJSON(): string;
}
export { URL as PolyURL, URLSearchParams as PolyURLSearchParams };
//# sourceMappingURL=url-polyfill.d.ts.map