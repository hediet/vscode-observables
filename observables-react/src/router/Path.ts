function relative(path: string[], prefix: string[]): string[] {
    for (let i = 0; i < prefix.length; i++) {
        if (path[i] !== prefix[i]) {
            return ['..'];
        }
    }
    return path.slice(prefix.length);
}

export class NavigationPath {
    public static create(path: string, queryArgs: QueryArgs): NavigationPath {
        const parts = parsePath(path);
        return new NavigationPath(parts, queryArgs, '', null);
    }

    public static fromUrl(url: URL, rootUrl: URL): NavigationPath {
        const rootPath = parsePath(rootUrl.pathname);
        const urlPath = parsePath(url.pathname);
        const path = relative(urlPath, rootPath);
        const p = new URLSearchParams(url.search);
        const queryArgs = Object.fromEntries(p);
        return new NavigationPath(path, queryArgs, url.hash, null);
    }

    public toUrl(rootUrl: URL): URL {
        const parts = parsePath(rootUrl.pathname);
        const url = new URL(parts.join('/') + this.toString(), rootUrl);
        return url;
    }

    constructor(
        public readonly path: string[],
        public readonly queryArgs: QueryArgs,
        public readonly hash: string,

        /**
         * Has to serialize/deserialize to/from json
         */
        public readonly state: unknown,
    ) { }

    public getPathString(): string {
        return "/" + this.path.join("/");
    }

    public toString(): string {
        let str = this.getPathString();
        const search = new URLSearchParams(this.queryArgs).toString();
        if (search !== "") {
            str += `?${search}`;
        }
        return str;
    }
}

export interface QueryArgs {
    readonly [key: string]: string;
}

function parsePath(path: string): string[] {
    if (!path.startsWith("/")) {
        throw new Error(`Expected pathname "${path}" to start with "/"`);
    }
    path = path.substring(1);
    const items = path ? path.split("/") : [];
    return items;
}
