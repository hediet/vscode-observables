import { derivedDisposable, IObservable, IReader } from "@vscode/observables";
import { IDisposable, DisposableStore } from "@vscode/observables";
import { IPropertyTransformerFactory, prop } from "./IPropertyTransformer";
import { obsView } from "./obsView";
import React, { ReactNode } from "react";

export type PropsDesc = Record<string, IPropertyTransformerFactory<any, any>>;

type PropsIn<T extends PropsDesc> = {
    [K in keyof T]: T[K] extends IPropertyTransformerFactory<infer U, any> ? U : never;
};

type PropsOut<T extends PropsDesc> = {
    [K in keyof T]: T[K] extends IPropertyTransformerFactory<any, infer U> ? U : never;
};

export function mapObject<T extends Record<string, any>, U>(obj: T, fn: (value: T[keyof T], key: string) => U): { [K in keyof T]: U } {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key)])) as any;
}

export function view<T extends PropsDesc>(props: T, render: (reader: IReader, props: PropsOut<T>) => React.ReactNode): React.ComponentType<PropsIn<T>> {
    return obsView('view', p => {
        const readableProps = mapObject(props, (value, key) => {
            return value.create(reader => p.read(reader)[key]);
        });

        return reader => {
            const propValues = mapObject(readableProps, (value) => {
                return value.read(reader);
            });
            return render(reader, propValues);
        };
    });
}

class BaseViewModel<TProps> implements IDisposable {
    protected readonly props: TProps;

    protected _store = new DisposableStore();

    constructor(props: TProps) {
        this.props = props;
    }

    dispose(): void {
        this._store.dispose();
    }
}

type ViewModelCtor<TArg, T, TModelProps> = (new (arg: TArg) => T) & { _props: TModelProps };

export function ViewModel<T extends PropsDesc>(props: T): ViewModelCtor<PropsOut<T>, BaseViewModel<PropsOut<T>>, T> {
    return class extends BaseViewModel<PropsOut<T>> {
        static _props = props;
    };
}


export function viewWithModel<TModelProps extends PropsDesc, TProps extends PropsDesc, TModel extends IDisposable>(
    viewModelCtor: ViewModelCtor<PropsOut<TModelProps>, TModel, TModelProps> | (new () => TModel),
    props: TProps,
    render: (reader: IReader, model: TModel, props: PropsOut<TProps>) => React.ReactNode,
): React.ComponentType<PropsIn<TModelProps> & PropsIn<TProps>> {
    return obsView('view', p => {
        const readableModelProps = '_props' in viewModelCtor ? mapObject(viewModelCtor._props, (value, key) => {
            return value.create(reader => p.read(reader)[key]);
        }) : {} as never;

        const model = derivedDisposable(reader => {
            const props = mapObject(readableModelProps, value => value.read(reader));
            return new viewModelCtor(props);
        });
        const readableProps = mapObject(props, (value, key) => {
            return value.create(reader => p.read(reader)[key]);
        });

        return reader => {
            const m = model.read(reader);
            const propValues = mapObject(readableProps, (value) => {
                return value.read(reader);
            });
            return render(reader, m, propValues);
        };
    });
}

export const Value = view({ value: prop.obs<ReactNode>() }, (reader, props) => {
    return props.value.read(reader);
});

export function val(v: IObservable<ReactNode>) {
    return <Value value={v} />;
}
