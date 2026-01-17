import { createContext, useContext, ReactNode, Context } from "react";
import { IPropertyTransformerFactory, IReadableObj, Readable } from "./IPropertyTransformer";

// =============================================================================
// Service Key
// =============================================================================

export interface ServiceKey<T> {
    readonly _brand: T;
    readonly id: symbol;
    readonly name: string;
}

export function createServiceKey<T>(name: string): ServiceKey<T> {
    return { _brand: undefined as T, id: Symbol(name), name };
}

// =============================================================================
// DI Container
// =============================================================================

export class DIContainer {
    private readonly _services = new Map<symbol, unknown>();
    private readonly _parent: DIContainer | null;

    constructor(parent: DIContainer | null = null) {
        this._parent = parent;
    }

    register<T>(key: ServiceKey<T>, service: T): this {
        this._services.set(key.id, service);
        return this;
    }

    get<T>(key: ServiceKey<T>): T {
        const service = this._services.get(key.id);
        if (service !== undefined) return service as T;
        if (this._parent) return this._parent.get(key);
        throw new Error(`Service "${key.name}" not registered`);
    }

    has<T>(key: ServiceKey<T>): boolean {
        return this._services.has(key.id) || (this._parent?.has(key) ?? false);
    }

    createChild(): DIContainer {
        return new DIContainer(this);
    }
}

// =============================================================================
// React Context
// =============================================================================

export const DIContext: Context<DIContainer | null> = createContext<DIContainer | null>(null);

export function DIProvider({ container, children }: { container: DIContainer; children: ReactNode }): ReactNode {
    return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
}

export function useDIContainer(): DIContainer {
    const container = useContext(DIContext);
    if (!container) throw new Error("DIProvider not found");
    return container;
}

// =============================================================================
// inject() - Property Transformer for DI
// =============================================================================

class InjectTransformerFactory<T> implements IPropertyTransformerFactory<never, T> {
    readonly _requiredContext = DIContext as Context<unknown>;

    constructor(public readonly serviceKey: ServiceKey<T>) { }

    create(_readable: Readable<never>, contextValue: unknown): IReadableObj<T> {
        const container = contextValue as DIContainer | null;
        if (!container) throw new Error(`inject(${this.serviceKey.name}): DIProvider not found`);
        const service = container.get(this.serviceKey);
        return { read: () => service };
    }
}

/** Inject a service from DIContainer into a ViewModel property */
export function inject<T>(key: ServiceKey<T>): IPropertyTransformerFactory<never, T> & { _requiredContext: Context<unknown> } {
    return new InjectTransformerFactory(key);
}
