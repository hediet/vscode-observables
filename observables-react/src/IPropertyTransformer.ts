import { derived, IObservable, IReader } from "@vscode/observables";
import { Context } from "react";

export type Readable<T> = (reader: IReader) => T;

export interface IReadableObj<T> {
    /**
     * The reader of the component.
    */
    read(reader: IReader): T;
}

export interface IPropertyTransformerFactory<TIn, TOut> {
    /** If set, this context's value is passed to create() */
    readonly _requiredContext?: Context<unknown>;
    /** @param contextValue - value of _requiredContext if declared, otherwise undefined */
    create(readable: Readable<TIn>, contextValue: unknown): IReadableObj<TOut>;
}

/**
 * Takes a value of type `T` and makes it available as `IObservable<T>`.
 * When it changes, the component will not re-render.
 */
export function prop<T>(): IPropertyTransformerFactory<T, IObservable<T>> {
    return PropertyTransformerFactory.instance;
}

/**
 * Takes a value of type `T` and makes it available as `T`.
 * When it changes, the component will re-render.
 */
function propConst<T>(): IPropertyTransformerFactory<T, T> {
    return PropertyConstTransformerFactory.instance;
}

/**
 * Takes a value of type `T` or `IObservable<T>` and makes it available as `IObservable<T>`.
 * When it changes, the component will not re-render.
 */
function propObs<T>(): IPropertyTransformerFactory<T | IObservable<T>, IObservable<T>> {
    return PropertyObsTransformerFactory.instance;
}

prop.const = propConst;
prop.obs = propObs;

class PropertyTransformerFactory<T> implements IPropertyTransformerFactory<T, IObservable<T>> {
    public static readonly instance = new PropertyTransformerFactory<any>();

    create(readableProp: Readable<T>): IReadableObj<IObservable<T>> {
        const d = derived(reader => readableProp(reader));
        return { read: (_reader) => d };
    }
}

class PropertyConstTransformerFactory<T> implements IPropertyTransformerFactory<T, T> {
    public static readonly instance = new PropertyConstTransformerFactory<any>();

    create(readableProp: Readable<T>): IReadableObj<T> {
        const d = derived(reader => readableProp(reader));
        return { read: (reader) => d.read(reader) };
    }
}

class PropertyObsTransformerFactory<T> implements IPropertyTransformerFactory<T | IObservable<T>, IObservable<T>> {
    public static readonly instance = new PropertyObsTransformerFactory<any>();

    create(readableProp: Readable<T | IObservable<T>>): IReadableObj<IObservable<T>> {
        const d = derived(reader => {
            const v = readableProp(reader);
            if (isObservable(v)) {
                return v.read(reader);
            } else {
                return v;
            }
        });
        return { read: (_reader) => d };
    }
}

function isObservable(obs: any): obs is IObservable<any> {
    return typeof obs === "object" && obs !== null && "read" in obs;
}
