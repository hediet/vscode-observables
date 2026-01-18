import { IReader } from "@vscode/observables";
import React from "react";
import { obsView } from "./obsView";
import { mapObject } from "./utils";
import { PropsDesc, PropsIn, PropsOut } from "./viewModel";

/**
 * Creates a React component with typed observable props.
 * Props are transformed according to their IPropertyTransformerFactory.
 */
export function view<T extends PropsDesc>(
    props: T,
    render: (reader: IReader, props: PropsOut<T>) => React.ReactNode
): React.ComponentType<PropsIn<T>> {
    return obsView('view', (p) => {
        const readableProps = mapObject(props, (value, key) => {
            return value.create(reader => p.read(reader)[key], undefined);
        });

        return reader => {
            const propValues = mapObject(readableProps, (value) => {
                return value.read(reader);
            });
            return render(reader, propValues);
        };
    });
}
