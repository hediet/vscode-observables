export class CancellationError extends Error {
    constructor(message: string = 'Operation was cancelled') {
        super(message);
        this.name = 'CancellationError';
    }
}

export interface CancellationToken {
    readonly isCancellationRequested: boolean;
    readonly onCancellationRequested: (listener: () => void) => { dispose: () => void };
}

export class CancellationTokenSource {
    private _isCancelled = false;
    private _listeners: Set<() => void> = new Set();

    get token(): CancellationToken {
        return {
            isCancellationRequested: this._isCancelled,
            onCancellationRequested: (listener: () => void) => {
                this._listeners.add(listener);
                if (this._isCancelled) {
                    listener();
                }
                return {
                    dispose: () => {
                        this._listeners.delete(listener);
                    }
                };
            }
        };
    }

    cancel(): void {
        if (!this._isCancelled) {
            this._isCancelled = true;
            for (const listener of this._listeners) {
                listener();
            }
        }
    }

    dispose(): void {
        this._listeners.clear();
    }
}