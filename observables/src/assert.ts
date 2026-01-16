import { BugIndicatingError } from "./observableInternal/commonFacade/deps";

export function assert(condition: boolean): void {
    if (!condition) {
        throw new BugIndicatingError('assertion failed');
    }
}

export function assertNonExoticNumber(value: number): void {
    if (typeof value !== 'number' || value !== value || value === Infinity || value === -Infinity) {
        throw new BugIndicatingError('assertion failed');
    }
}