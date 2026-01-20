import { IObservable } from "@vscode/observables";
import { ReactNode } from "react";
import { prop } from "./IPropertyTransformer";
import { view } from "./view";

/**
 * A component that renders an observable ReactNode value.
 * Re-renders when the observable changes.
 * Usage: <Value value={myObservable} />
 */
export const Value = view({ value: prop.obs<ReactNode>() }, (reader, props) => {
    return props.value.read(reader);
});

/**
 * Helper function to render an observable as inline JSX.
 * Usage: {val(myObservable)}
 */
export function val(v: IObservable<ReactNode>): ReactNode {
    return <Value value={v} />;
}
