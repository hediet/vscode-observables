import { observableValue, IObservable } from "@vscode/observables";
import { NavigationPath } from "./Path";
import { Route } from "./Route";

export interface ILinkData {
    onClick: (e: React.MouseEvent) => void;
    href: string;
}

export class Navigator {
    constructor(
        public readonly root = new URL('/', document.location.href),
    ) {
        window.addEventListener('popstate', () => {
            this._currentPath.set(NavigationPath.fromUrl(new URL(document.location.href), this.root), undefined);
        });
    }

    public getLinkData(route: Route<void>): ILinkData;
    public getLinkData<TArgs extends {} | void>(route: Route<TArgs>, data: TArgs): ILinkData;
    public getLinkData<TArgs extends {} | void>(route: Route<TArgs>, data?: TArgs): ILinkData {
        return {
            onClick: (e) => {
                e.preventDefault();
                this.navigateTo(route, data);
            },
            href: route.build(data ?? {} as TArgs).toUrl(this.root).toString(),
        };
    }

    private readonly _currentPath = observableValue(this, NavigationPath.fromUrl(new URL(document.location.href), this.root));
    public readonly currentPath: IObservable<NavigationPath> = this._currentPath;

    public navigateTo(route: Route<void>): void;
    public navigateTo<TArgs extends {} | void>(route: Route<TArgs>, args: TArgs): void;
    public navigateTo<TArgs extends {} | void>(route: Route<TArgs>, args?: TArgs): void {
        const path = route.build(args ?? {} as TArgs);
        const p = path.toUrl(this.root).toString();
        this._currentPath.set(path, undefined);
        history.pushState(undefined, '', p);
    }
}
