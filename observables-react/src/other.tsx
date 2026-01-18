import { derivedDisposable, IObservable, IReader } from "@vscode/observables";
import { IDisposable, DisposableStore } from "@vscode/observables";
import { IPropertyTransformerFactory, prop } from "./IPropertyTransformer";
import { obsView } from "./obsView";
import React, { ReactNode, Context, createContext } from "react";

export type PropsDesc = Record<string, IPropertyTransformerFactory<any, any>>;

// Symbol to store the context on the ViewModel class
const ViewModelContextSymbol = Symbol('ViewModelContext');

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

// Type for ViewModel classes created via ViewModel()
type ViewModelClass<TProps extends PropsDesc> = {
    new (arg: PropsOut<TProps>): BaseViewModel<PropsOut<TProps>>;
    _props: TProps;
    [ViewModelContextSymbol]?: Context<unknown>;
};

/** Get or create the context for a ViewModel class */
function getOrCreateViewModelContext<T>(ctor: { [ViewModelContextSymbol]?: Context<T | undefined> }): Context<T | undefined> {
    if (!ctor[ViewModelContextSymbol]) {
        (ctor as any)[ViewModelContextSymbol] = createContext<T | undefined>(undefined);
    }
    return ctor[ViewModelContextSymbol]!;
}

export function ViewModel<T extends PropsDesc>(props: T): ViewModelClass<T> {
    return class extends BaseViewModel<PropsOut<T>> {
        static _props = props;
    } as ViewModelClass<T>;
}

/** Provider component to override a ViewModel instance in tests */
export function ProvideViewModel<T>({ 
    viewModel: ViewModelClass, 
    value, 
    children 
}: { 
    viewModel: { [ViewModelContextSymbol]?: Context<T | undefined> }; 
    value: T; 
    children: ReactNode;
}): ReactNode {
    const Context = getOrCreateViewModelContext<T>(ViewModelClass);
    return <Context.Provider value={value}>{children}</Context.Provider>;
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

// Overload 1: ViewModel-based classes with _props
export function viewWithModel<
    TModelProps extends PropsDesc,
    TProps extends PropsDesc,
    TModel extends BaseViewModel<PropsOut<TModelProps>>
>(
    viewModelCtor: (new (arg: PropsOut<TModelProps>) => TModel) & { _props: TModelProps; [ViewModelContextSymbol]?: Context<unknown> },
    props: TProps,
    render: (reader: IReader, model: TModel, props: PropsOut<TProps>) => React.ReactNode,
): React.ComponentType<WithOptionalInjected<TModelProps> & WithOptionalInjected<TProps>>;

// Overload 2: Simple classes without _props
export function viewWithModel<
    TProps extends PropsDesc,
    TModel extends IDisposable
>(
    viewModelCtor: new () => TModel,
    props: TProps,
    render: (reader: IReader, model: TModel, props: PropsOut<TProps>) => React.ReactNode,
): React.ComponentType<WithOptionalInjected<TProps>>;

export function viewWithModel(
    viewModelCtor: any,
    props: any,
    render: any,
): any {
    const modelPropsDesc = '_props' in viewModelCtor ? viewModelCtor._props : {};
    const requiredContexts = collectRequiredContexts({ ...modelPropsDesc, ...props });
    
    // Always create the context so ProvideViewModel can work
    const viewModelContext = getOrCreateViewModelContext(viewModelCtor);
    
    const allContexts = [...requiredContexts, viewModelContext];

    return obsView(
        'viewWithModel',
        (p, getContextValues) => {
            const contextValues = getContextValues();
            const providedModel = contextValues.get(viewModelContext);
            const readableModelProps = '_props' in viewModelCtor 
                ? mapObject(viewModelCtor._props, (v: any, k: string) => v.create((r: IReader) => p.read(r)[k], contextValues.get(v._requiredContext!))) 
                : {} as never;

            const model = providedModel 
                ? { read: () => providedModel, dispose: () => {} }
                : derivedDisposable(reader => {
                    const modelProps = mapObject(
                        readableModelProps, 
                        (v: any) => v.read(reader)
                    );
                    return new viewModelCtor(modelProps);
                });
            const readableProps = mapObject(props, 
                (v: any, k: string) => v.create(
                    (r: IReader) => p.read(r)[k],
                    contextValues.get(v._requiredContext!)
                )
            );

            return (reader: IReader) => {
                const m = model.read(reader);
                const propValues = mapObject(readableProps, (v: any) => v.read(reader));
                return render(reader, m, propValues);
            };
        },
        allContexts.length > 0 ? allContexts : undefined
    );
}

export const Value = view({ value: prop.obs<ReactNode>() }, (reader, props) => {
    return props.value.read(reader);
});

export function val(v: IObservable<ReactNode>) {
    return <Value value={v} />;
}
