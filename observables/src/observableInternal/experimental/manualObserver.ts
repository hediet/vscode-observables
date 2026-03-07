/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable, IObservableWithChange, IObserver, IReader } from '../base';
import { IDisposable } from '../commonFacade/deps';
import { getLogger } from '../logging/logging';
import { DebugLocation } from '../debugLocation';

export class ManualChangesHandler implements IObserver {
	private _changes: IObservable<any>[] = [];
	private _updateCounter = 0;

	constructor(
		public readonly _run: (changes: IObservable<any>[]) => void
	) { }

	beginUpdate<T>(observable: IObservableWithChange<T, unknown>): void {
		this._updateCounter++;
		this._changes.push(observable);
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
		this._changes.push(observable);
	}

	handleChange<T, TChange>(_observable: IObservableWithChange<T, TChange>, _change: TChange): void {
	}
}

export class ManualObserver implements IReader, IDisposable {
	private readonly _handler: ManualChangesHandler;
	private readonly _dependencies = new Set<IObservable<any>>();
	private _disposed = false;

	readonly debugName: string;

	constructor(
		private readonly _run: (reader: IReader) => void,
		debugName?: string,
		debugLocation: DebugLocation = DebugLocation.ofCaller(),
	) {
		this.debugName = debugName ?? '(anonymous ManualObserver)';
		this._handler = new ManualChangesHandler(() => {
			if (!this._disposed) {
				this._run(this);
			}
		});
		getLogger()?.handleAutorunCreated(this._handler as any, debugLocation);
	}

	get reader(): IReader {
		return this;
	}

	readObservable<T>(observable: IObservableWithChange<T, unknown>): T {
		observable.addObserver(this._handler);
		const value = observable.get();
		this._dependencies.add(observable);
		return value;
	}

	getDependencies(): ReadonlySet<IObservable<any>> {
		return this._dependencies;
	}

	dispose(): void {
		if (this._disposed) { return; }
		this._disposed = true;
		for (const dep of this._dependencies) {
			dep.removeObserver(this._handler);
		}
		this._dependencies.clear();
		getLogger()?.handleAutorunDisposed(this._handler as any);
	}
}
