type Nullable<T> = T | null;
export declare class URLSearchParams implements Iterable<[string, string]> {
    private _map;
    constructor(init?: string | Record<string, string> | Array<[string, string]> | URLSearchParams);
    append(name: string, value: string): void;
    set(name: string, value: string): void;
    get(name: string): Nullable<string>;
    getAll(name: string): string[];
    has(name: string): boolean;
    delete(name: string): void;
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
    private _p;
    searchParams: URLSearchParams;
    constructor(input: string, base?: string | URL);
    private _bindSearchParamsUpdates;
    static canParse(url: string, base?: string): boolean;
    static parse(url: string, base?: string): URL | null;
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
    private _updateOrigin;
    toString(): string;
    toJSON(): string;
}
export { URL as PolyURL, URLSearchParams as PolyURLSearchParams };
//# sourceMappingURL=url-polyfill.d.ts.map