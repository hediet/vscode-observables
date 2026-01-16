import { IObservable, IObservableWithChange, IObserver, IDisposable } from "@vscode/observables";

export class ManualChangesHandler<TData> implements IObserver {
	private _changes: TData[] = [];
	private readonly _map = new Map<IObservable<any>, TData>();

	constructor(
		public readonly _run: (changes: TData[]) => void
	) { }

	addDependency(observable: IObservable<any>, data: TData): IDisposable {
		this._map.set(observable, data);
		observable.addObserver(this);
		return {
			dispose: () => {
				this._map.delete(observable);
				observable.removeObserver(this);
			}
		};
	}
	private _updateCounter = 0;

	beginUpdate<T>(observable: IObservableWithChange<T, unknown>): void {
		this._updateCounter++;
		this._changes.push(this._map.get(observable)!);
	}

	endUpdate<T>(_observable: IObservableWithChange<T, unknown>): void {
		this._updateCounter--;
		if (this._updateCounter === 0) {
			if (this._changes.length > 0) {
				const c = this._changes;
				this._changes = [];
				this._run(c);
			}
		}
	}

	handlePossibleChange<T>(observable: IObservableWithChange<T, unknown>): void {
		this._changes.push(this._map.get(observable)!);
	}

	handleChange<T, TChange>(_observable: IObservableWithChange<T, TChange>, _change: TChange): void {
		//this._changes.push(this._map.get(observable)!);
	}
}
