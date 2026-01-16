/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable } from '../base';
import { Event, IValueWithChangeEvent, IDisposable } from '../commonFacade/deps';
import { DebugOwner } from '../debugName';
import { observableFromEvent } from '../observables/observableFromEvent';
import { autorun } from '../reactions/autorun';

/**
 * Creates an Event from an observable that fires whenever the observable changes.
 */
function eventFromObservable<T>(observable: IObservable<T>): Event<void> {
	return (listener: () => void): IDisposable => {
		let isFirst = true;
		return autorun(reader => {
			observable.read(reader);
			if (isFirst) {
				isFirst = false;
			} else {
				listener();
			}
		});
	};
}

export class ValueWithChangeEventFromObservable<T> implements IValueWithChangeEvent<T> {
	constructor(public readonly observable: IObservable<T>) {
	}

	get onDidChange(): Event<void> {
		return eventFromObservable(this.observable);
	}

	get value(): T {
		return this.observable.get();
	}
}

export function observableFromValueWithChangeEvent<T>(owner: DebugOwner, value: IValueWithChangeEvent<T>): IObservable<T> {
	if (value instanceof ValueWithChangeEventFromObservable) {
		return value.observable;
	}
	return observableFromEvent(owner, value.onDidChange, () => value.value);
}
