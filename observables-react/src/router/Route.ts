import { NavigationPath } from "./Path";
import { PathPattern } from "./PathPattern";

export class Route<TArgs extends {} | void = void> implements PathMatcher<TArgs> {
    public static create(path: string): Route<void>;

    public static create<TPathArgs extends PathArgs>(
        path: string,
        pathArgs: TPathArgs
    ): Route<PathArgsToType<TPathArgs>>;
    public static create<TPathArgs extends PathArgs, TQueryArgs extends QueryArgs>(
        path: string,
        pathArgs: TPathArgs,
        queryArgs: TQueryArgs
    ): Route<PathArgsToType<TPathArgs> & QueryArgsToType<TQueryArgs>>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static create(path: string, pathArgs?: PathArgs, queryArgs?: QueryArgs): Route<any> {
        return new Route(path, pathArgs ?? {}, queryArgs ?? {});
    }

    private readonly _pathPattern = PathPattern.parse(this.path);

    private constructor(
        public readonly path: string,
        public readonly args: PathArgs,
        public readonly queryArgs: QueryArgs,
    ) { }

    public build(args: TArgs): NavigationPath {
        const pathArgs: Record<string, unknown> = {};
        for (const key in this.args) {
            pathArgs[key] = (args as Record<string, unknown>)[key];
        }

        const path = this._pathPattern.build(pathArgs);

        const queryArgs: Record<string, string> = {};
        for (const key in this.queryArgs) {
            const v = this.queryArgs[key];
            if (typeof v === 'object') {
                queryArgs[key] = v.const;
            } else {
                queryArgs[key] = (args as Record<string, unknown>)[key] as string;
            }
        }

        return NavigationPath.create(path, queryArgs);
    }

    public matches(path: NavigationPath): TArgs | undefined {
        const r = this._pathPattern.match(path.getPathString());
        if (!r) { return undefined; }

        const params = new URLSearchParams(path.queryArgs);
        const args: Record<string, unknown> = { ...r };
        for (const [key, type] of Object.entries(this.queryArgs)) {
            const value = params.get(key);
            if (value === null) {
                return undefined;
            }
            if (typeof type === 'object') {
                if (value !== type.const) {
                    return undefined;
                }
            } else {
                args[key] = value;
            }
        }
        return args as TArgs;
    }
}

export interface PathMatcher<T> {
    matches(path: NavigationPath): T | undefined;
}

export type PathArgs = Record<string, "string"/* | "number"*/>;
export type QueryArgs = Record<string, "string" | { const: string }>;

export type PathArgsToType<T extends PathArgs> = {
    [TKey in keyof T]: {
        string: string;
    }[T[TKey]];
};

type PrimitiveTypeMap = {
    string: string
};
export type QueryArgsToType<T extends QueryArgs> = {
    [TKey in keyof T]: T[TKey] extends keyof PrimitiveTypeMap ? PrimitiveTypeMap[T[TKey]] : never
} extends infer O ? { [K in keyof O as O[K] extends never ? never : K]: O[K] } : never;
