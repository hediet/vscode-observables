import { NavigationPath } from "./Path";
import { PathMatcher } from "./Route";

export class Router<TOut, TRouteArgs = {}> {
    public static create<TData>(): Router<TData, {}> {
        return new Router(undefined, undefined);
    }

    private constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private readonly _parent: Router<TOut, any> | undefined,
        private readonly _addedRoute: AddedRoute<TOut> | undefined
    ) { }

    public with<TNewArgs>(matcher: PathMatcher<TNewArgs>, dataProvider: (args: TNewArgs) => TOut): Router<TOut, TRouteArgs & TNewArgs> {
        return new Router(this, { matcher: matcher as PathMatcher<unknown>, dataProvider: dataProvider as (args: unknown) => TOut });
    }

    public route(path: NavigationPath): RouteResult<TOut, TRouteArgs> | undefined {
        if (this._addedRoute) {
            const args = this._addedRoute.matcher.matches(path);
            if (args) {
                return {
                    args: args as TRouteArgs,
                    out: this._addedRoute.dataProvider(args),
                    matcher: this._addedRoute.matcher,
                };
            }
        }
        if (this._parent) {
            return this._parent.route(path) as RouteResult<TOut, TRouteArgs> | undefined;
        }
        return undefined;
    }
}

export interface RouteResult<TOut, TArgs> {
    args: TArgs;
    out: TOut;
    matcher: PathMatcher<unknown>;
}

interface AddedRoute<TData> {
    matcher: PathMatcher<unknown>;
    dataProvider: (args: unknown) => TData;
}
