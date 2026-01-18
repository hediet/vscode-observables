import { derivedDisposable, IDisposable, IReader } from "@vscode/observables";
import React, { Context } from "react";
import { IPropertyTransformerFactory } from "./IPropertyTransformer";
import { obsView } from "./obsView";
import { mapObject } from "./utils";
import {
    BaseViewModel,
    getOrCreateViewModelContext,
    PropsDesc,
    PropsOut,
    ViewModelContextSymbol,
} from "./viewModel";

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
