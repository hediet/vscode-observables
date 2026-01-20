export interface IDisposable {
    dispose(): void;
}

export class DisposableStore implements IDisposable {
    private disposables: IDisposable[] = [];
    private _isDisposed = false;

    get isDisposed(): boolean { return this._isDisposed; }

    dispose(): void {
        this.clear();
        this._isDisposed = true;
    }

    add<T extends IDisposable | undefined>(disposable: T): T {
        if (disposable) {
            this.disposables.push(disposable);
        }
        return disposable;
    }

    remove<T extends IDisposable | undefined>(disposable: T): T {
        if (!disposable) {
            return disposable;
        }
        const index = this.disposables.indexOf(disposable);
        if (index !== -1) {
            this.disposables.splice(index, 1);
        }
        return disposable;
    }

    clear(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    leakItems(): void {
        this.disposables = [];
    }
}

export abstract class Disposable implements IDisposable {
    protected readonly _store = new DisposableStore();

    dispose(): void {
        this._store.dispose();
    }

    protected _register<T extends IDisposable>(t: T): T {
        this._store.add(t);
        return t;
    }

    protected _registerOrDispose<T extends IDisposable | undefined>(t: T): T {
        if (t) {
            if (this._store.isDisposed) {
                t.dispose();
            } else {
                this._store.add(t);
            }
        }
        return t;
    }
}
