import { IObservable } from '../base';
import { BugIndicatingError, DisposableStore, IDisposable } from '../commonFacade/deps';
import { derived } from '../observables/derived';
import { observableSignalFromEvent } from '../observables/observableSignalFromEvent';
import { keepObserved } from '../utils/utils';

/**
 * Wraps an observable so that its source remains observed for a grace period
 * after the wrapping observable loses all its observers.
 *
 * When the wrapping observable has observers, an autorun keeps `obs` observed
 * and forwards changes. When the last observer is removed, `obs` stays observed
 * via `keepObserved` for `maxIdleTimeMs` before being released. If a new observer
 * arrives during the grace period, the keep-alive is cancelled seamlessly.
 *
 * @param store - Controls the hard lifetime; disposing it cancels any pending grace period.
 * @param obs - The source observable to keep alive longer.
 * @param maxIdleTimeMs - Grace period in milliseconds.
 */
export function deferUnobserve<T>(store: DisposableStore, obs: IObservable<T>, maxIdleTimeMs: number): IObservable<T> {
	let keepAliveHandle: IDisposable | undefined;
	let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

	const lifetimeTracker = observableSignalFromEvent(
        'deferUnobserve',
		_ => {
            if (disposed) {
                throw new BugIndicatingError('deferUnobserve: Cannot add observer after disposal');
            }
			// First observer added to `lifetimeTracker`
			if (timeoutHandle !== undefined) {
				clearTimeout(timeoutHandle);
				timeoutHandle = undefined;
			}
            if (!keepAliveHandle) {
                keepAliveHandle = keepObserved(obs);
            }

			return {
				dispose() {
					// Keep source observed during the grace period	
					timeoutHandle = setTimeout(() => {
						timeoutHandle = undefined;
						keepAliveHandle?.dispose();
						keepAliveHandle = undefined;
					}, maxIdleTimeMs);
				},
			};
		}
	);

	store.add({
		dispose() {
			if (timeoutHandle !== undefined) {
				clearTimeout(timeoutHandle);
				timeoutHandle = undefined;
			}
			keepAliveHandle?.dispose();
			keepAliveHandle = undefined;
            disposed = true;
		},
	});

    return derived(reader => {
        lifetimeTracker.read(reader);
        return obs.read(reader);
    });
}
