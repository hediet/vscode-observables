import React, { Context, useContext, useEffect, useReducer, useState } from "react";
import { derived, IReader, observableValue, IObservable, ISettableObservable, IDisposable } from "@vscode/observables";
import { ManualChangesHandler } from "./ManualChangesHandler";
import { unstable_batchedUpdates } from "react-dom";

export type ContextValues = Map<Context<unknown>, unknown>;

let renderingCount = 0;

const batchedUpdater = new ManualChangesHandler<ViewImpl<any>>(potentialChanges => {
    for (const change of potentialChanges) {
        change.rendered = false;
    }

    if (renderingCount > 0) {
        const rendering = potentialChanges.find(c => c.isRendering)!;
        rendering.itemsToRender = potentialChanges;
    } else {
        unstable_batchedUpdates(() => {
            for (const change of potentialChanges) {
                if (!change.rendered) {
                    change.forceUpdate!();
                }
            }
        });
    }
});

let viewIdx = 0;

class ViewImpl<TProps extends Record<string, any>> {
    private _obsProps: ISettableObservable<TProps> = undefined!;
    public forceUpdate: (() => void) | undefined = undefined;
    private _render: ((reader: IReader) => React.ReactNode) = undefined!;
    private _disposable: IDisposable | undefined = undefined;
    public contextValues: ContextValues = new Map();

    constructor(
        public readonly debugName: string,
        private readonly renderFactory: (props: IObservable<TProps>, getContextValues: () => ContextValues) => (reader: IReader) => React.ReactNode
    ) { }

    toString() {
        return this.debugName;
    }

    public updateProps(props: TProps): void {
        if (!this._obsProps) {
            this._obsProps = observableValue(this, props);
            this._render = this.renderFactory(this._obsProps, () => this.contextValues);
            this.rendering = derived(this, this._render);
            this._disposable = batchedUpdater.addDependency(this.rendering, this);
        } else {
            this._obsProps.set(props, undefined);
        }
    }

    public readonly cleanupEffect = () => {
        return () => {
            this._disposable?.dispose();
        };
    };

    public itemsToRender: ViewImpl<any>[] = [];

    public readonly handleAfterRender = () => {
        unstable_batchedUpdates(() => {
            for (const change of this.itemsToRender) {
                if (!change.rendered) {
                    change.forceUpdate!();
                }
            }
        });
        this.itemsToRender = [];
    };

    public rendering: IObservable<React.ReactNode> = undefined!;
    public isRendering = false;

    public rendered = false;
}

export function obsView<TProps extends Record<string, any>>(
    componentName: string,
    render: (props: IObservable<TProps>, getContextValues: () => ContextValues) => ((reader: IReader) => React.ReactNode),
    contexts?: Context<unknown>[]
) {
    const plusOne = (x: number) => x + 1;
    const createVM = () => new ViewImpl<TProps>(componentName + (++viewIdx), render);
    const fn = function (props: TProps): React.ReactNode {
        const forceUpdate = useReducer(plusOne, 0)[1];
        const state = useState<ViewImpl<TProps>>(createVM)[0];

        // Read and update context values each render
        for (const ctx of contexts ?? []) {
            state.contextValues.set(ctx, useContext(ctx)); // eslint-disable-line react-hooks/rules-of-hooks
        }

        useEffect(state.cleanupEffect, []);
        useEffect(state.handleAfterRender);

        if (state.isRendering) {
            throw new Error("Component is already rendering");
        }
        state.isRendering = true;
        renderingCount++;
        try {
            state.forceUpdate = forceUpdate;
            state.updateProps(props);

            const result = state.rendering.get();
            state.rendered = true;
            return result;
        } finally {
            state.isRendering = false;
            renderingCount--;
        }
    };
    fn.displayName = componentName;
    return fn;
}

export const ObsView = obsView<{ children: (reader: IReader) => React.ReactNode }>('ObsView', (props) => reader => props.read(reader).children(reader));
