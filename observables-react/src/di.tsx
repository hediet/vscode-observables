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

/** Create a service key with a string name */
export function createServiceKey<T>(name: string): ServiceKey<T>;
/** Create a service key from a class constructor (uses class name) */
export function createServiceKey<T>(ctor: new (...args: never[]) => T): ServiceKey<T>;
export function createServiceKey<T>(nameOrCtor: string | (new (...args: never[]) => T)): ServiceKey<T> {
    const name = typeof nameOrCtor === 'string' ? nameOrCtor : nameOrCtor.name;
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

class InjectTransformerFactory<T> implements IPropertyTransformerFactory<T | undefined, T> {
    readonly _requiredContext = DIContext as Context<unknown>;

    constructor(public readonly serviceKey: ServiceKey<T>) { }

    create(readable: Readable<T | undefined>, contextValue: unknown): IReadableObj<T> {
        const container = contextValue as DIContainer | null;
        let cachedService: T | undefined;
        
        return {
            read: (reader) => {
                // Check if an explicit value was provided as a prop
                const explicitValue = readable(reader);
                if (explicitValue !== undefined) {
                    return explicitValue;
                }
                
                // Otherwise, use DI container (cached)
                if (cachedService === undefined) {
                    if (!container) throw new Error(`inject(${this.serviceKey.name}): DIProvider not found`);
                    cachedService = container.get(this.serviceKey);
                }
                return cachedService;
            }
        };
    }
}

/** Inject a service from DIContainer into a ViewModel property */
export function inject<T>(key: ServiceKey<T>): IPropertyTransformerFactory<T | undefined, T> & { _requiredContext: Context<unknown> } {
    return new InjectTransformerFactory(key);
}
