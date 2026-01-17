import { derivedDisposable, IObservable, IReader } from "@vscode/observables";
import { IDisposable, DisposableStore } from "@vscode/observables";
import { IPropertyTransformerFactory, prop } from "./IPropertyTransformer";
import { obsView } from "./obsView";
import React, { ReactNode, Context, useContext } from "react";

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

/** Check if a transformer has _requiredContext defined (injected) */
type HasRequiredContext<T> = T extends { _requiredContext: Context<unknown> } ? true : false;

/** Required props: non-injected properties that must be provided */
type RequiredProps<T extends PropsDesc> = {
    [K in keyof T as HasRequiredContext<T[K]> extends true ? never : K]: T[K] extends IPropertyTransformerFactory<infer U, any> ? U : never;
};

/** Optional props: injected properties that can be overridden */
type OptionalProps<T extends PropsDesc> = {
    [K in keyof T as HasRequiredContext<T[K]> extends true ? K : never]?: T[K] extends IPropertyTransformerFactory<any, infer U> ? U : never;
};

/** Combined props type: required + optional injected */
type WithOptionalInjected<T extends PropsDesc> = RequiredProps<T> & OptionalProps<T>;

/** Collect unique _requiredContext from transformers */
function collectRequiredContexts(propsDesc: PropsDesc): Context<unknown>[] {
    const contexts: Context<unknown>[] = [];
    for (const t of Object.values(propsDesc)) {
        const ctx = t._requiredContext;
        if (ctx && !contexts.includes(ctx)) contexts.push(ctx);
    }
    return contexts;
}

/** Core viewWithModel logic - creates model and wires up props */
function createCore<TModelProps extends PropsDesc, TProps extends PropsDesc, TModel extends IDisposable>(
    viewModelCtor: ViewModelCtor<PropsOut<TModelProps>, TModel, TModelProps> | (new () => TModel),
    props: TProps,
    render: (reader: IReader, model: TModel, props: PropsOut<TProps>) => React.ReactNode,
    contextValues: Map<Context<unknown>, unknown>,
) {
    return (p: IObservable<Record<string, unknown>>) => {
        const readableModelProps = '_props' in viewModelCtor 
            ? mapObject(viewModelCtor._props, (v, k) => v.create(r => p.read(r)[k], contextValues.get(v._requiredContext!))) 
            : {} as never;

        const model = derivedDisposable(reader => {
            const modelProps = mapObject(readableModelProps, v => v.read(reader));
            return new viewModelCtor(modelProps);
        });
        const readableProps = mapObject(props, (v, k) => v.create(r => p.read(r)[k], contextValues.get(v._requiredContext!)));

        return (reader: IReader) => {
            const m = model.read(reader);
            const propValues = mapObject(readableProps, v => v.read(reader));
            return render(reader, m, propValues);
        };
    };
}

const emptyContexts = new Map<Context<unknown>, unknown>();

export function viewWithModel<TModelProps extends PropsDesc, TProps extends PropsDesc, TModel extends IDisposable>(
    viewModelCtor: ViewModelCtor<PropsOut<TModelProps>, TModel, TModelProps> | (new () => TModel),
    props: TProps,
    render: (reader: IReader, model: TModel, props: PropsOut<TProps>) => React.ReactNode,
): React.ComponentType<WithOptionalInjected<TModelProps> & WithOptionalInjected<TProps>> {
    const modelPropsDesc = '_props' in viewModelCtor ? viewModelCtor._props : {};
    const requiredContexts = collectRequiredContexts({ ...modelPropsDesc, ...props });

    // Fast path: no contexts needed
    if (requiredContexts.length === 0) {
        return obsView('viewWithModel', createCore(viewModelCtor, props, render, emptyContexts)) as any;
    }

    // Slow path: wrap to read required contexts via hooks
    const InnerView = obsView('viewWithModel', (p: IObservable<{ __ctx: Map<Context<unknown>, unknown> } & Record<string, unknown>>) => {
        return createCore(viewModelCtor, props, render, p.get().__ctx)(p);
    });

    return function ContextWrapper(componentProps: WithOptionalInjected<TModelProps> & WithOptionalInjected<TProps>): ReactNode {
        const ctx = new Map<Context<unknown>, unknown>();
        for (const c of requiredContexts) ctx.set(c, useContext(c)); // eslint-disable-line react-hooks/rules-of-hooks
        return <InnerView {...componentProps as any} __ctx={ctx} />;
    } as any;
}

export const Value = view({ value: prop.obs<ReactNode>() }, (reader, props) => {
    return props.value.read(reader);
});

export function val(v: IObservable<ReactNode>) {
    return <Value value={v} />;
}
