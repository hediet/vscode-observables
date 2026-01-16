import { IDisposable } from "./disposables";
import { IObservableWithChange, autorunHandleChanges } from "./observableInternal/index";

type ObservableResult<T> = T extends IObservableWithChange<infer U, any> ? U : never;

type ObservableArrayToChangesData<T extends Record<string, IObservableWithChange<any, any>>> = {
	[Key in keyof T]: {
		value: ObservableResult<T[Key]>;
		changes: T[Key]['TChange'][];
		/**
		 * The value of the observable before the changes. `undefined` if
		 */
		previous: ObservableResult<T[Key]> | undefined;
	}
};

export function autorunWithChanges<T extends Record<string, IObservableWithChange<any, any>>>(owner: object, observables: T, handler: (data: ObservableArrayToChangesData<T>) => void): IDisposable {
	const observableToKey = new Map(Object.entries(observables).map(([key, value]) => [value, key] as const));

	const previousValues = new Map<string, unknown>(Object.keys(observables).map(key => [key, undefined]));

	return autorunHandleChanges({
		owner,
		changeTracker: {
			createChangeSummary: () => ({}) as ObservableArrayToChangesData<T>,
			handleChange: (ctx, changeSummary: ObservableArrayToChangesData<T>) => {
				const key = observableToKey.get(ctx.changedObservable)!;

				if ((changeSummary as Record<string, unknown>)[key] === undefined) {
					(changeSummary as Record<string, unknown>)[key] = { value: undefined!, changes: [] };
				}
				(changeSummary[key as keyof T] as { changes: unknown[] }).changes.push(ctx.change);
				return true;
			}
		}
	}, (reader, data) => {
		for (const [key, value] of Object.entries(observables)) {
			const v = value.read(reader);

			if ((data as Record<string, unknown>)[key] === undefined) {
				(data as Record<string, unknown>)[key] = { value: v, changes: [], previous: previousValues.get(key) };
			}
			(data[key as keyof T] as { value: unknown }).value = v;
			(data[key as keyof T] as { previous: unknown }).previous = previousValues.get(key) === undefined ? undefined : previousValues.get(key);
			previousValues.set(key, v);
		}
		handler(data);
	});
}
