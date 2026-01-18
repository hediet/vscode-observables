import { IDisposable, DisposableStore } from "@vscode/observables";
import { Context, createContext } from "react";
import { IPropertyTransformerFactory } from "./IPropertyTransformer";

// Symbol to store the context on the ViewModel class
export const ViewModelContextSymbol = Symbol('ViewModelContext');

export type PropsDesc = Record<string, IPropertyTransformerFactory<any, any>>;

export type PropsIn<T extends PropsDesc> = {
    [K in keyof T]: T[K] extends IPropertyTransformerFactory<infer U, any> ? U : never;
};

export type PropsOut<T extends PropsDesc> = {
    [K in keyof T]: T[K] extends IPropertyTransformerFactory<any, infer U> ? U : never;
};

export class BaseViewModel<TProps> implements IDisposable {
    protected readonly props: TProps;
    protected _store = new DisposableStore();

    constructor(props: TProps) {
        this.props = props;
    }

    dispose(): void {
        this._store.dispose();
    }
}

// Type for ViewModel classes created via ViewModel()
export type ViewModelClass<TProps extends PropsDesc> = {
    new (arg: PropsOut<TProps>): BaseViewModel<PropsOut<TProps>>;
    _props: TProps;
    [ViewModelContextSymbol]?: Context<unknown>;
};

/** Get or create the context for a ViewModel class */
export function getOrCreateViewModelContext<T>(
    ctor: { [ViewModelContextSymbol]?: Context<T | undefined> }
): Context<T | undefined> {
    if (!ctor[ViewModelContextSymbol]) {
        (ctor as { [ViewModelContextSymbol]?: Context<T | undefined> })[ViewModelContextSymbol] = 
            createContext<T | undefined>(undefined);
    }
    return ctor[ViewModelContextSymbol]!;
}

/**
 * Creates a ViewModel class with typed props.
 * Use this as a base class for your ViewModels.
 */
export function ViewModel<T extends PropsDesc>(props: T): ViewModelClass<T> {
    return class extends BaseViewModel<PropsOut<T>> {
        static _props = props;
    } as ViewModelClass<T>;
}
