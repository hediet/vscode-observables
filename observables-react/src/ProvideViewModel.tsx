import { Context, ReactNode } from "react";
import { ViewModelContextSymbol, getOrCreateViewModelContext } from "./viewModel";

/**
 * Provider component to override a ViewModel instance.
 * Useful for testing - allows injecting a mock ViewModel.
 */
export function ProvideViewModel<T>({ 
    viewModel: ViewModelClass, 
    value, 
    children 
}: { 
    viewModel: { [ViewModelContextSymbol]?: Context<T | undefined> }; 
    value: T; 
    children: ReactNode;
}): ReactNode {
    const ContextType = getOrCreateViewModelContext<T>(ViewModelClass);
    return <ContextType.Provider value={value}>{children}</ContextType.Provider>;
}

/**
 * Represents a mock binding of a ViewModel class to an instance.
 */
export interface ViewModelMock {
    readonly _viewModelClass: { [ViewModelContextSymbol]?: Context<unknown | undefined> };
    readonly _instance: unknown;
}

/**
 * Creates a mock binding for use with ProvideMockViewModels.
 */
export function mockViewModel<T>(
    viewModelClass: { [ViewModelContextSymbol]?: Context<T | undefined> },
    instance: T
): ViewModelMock {
    return {
        _viewModelClass: viewModelClass,
        _instance: instance,
    };
}

/**
 * Provider component to override multiple ViewModel instances at once.
 * Useful for testing - allows injecting multiple mock ViewModels.
 * 
 * @example
 * ```tsx
 * <ProvideMockViewModels mocks={[mockViewModel(AppPageViewModel, fakeViewModel)]}>
 *   <AppPage theme="light" />
 * </ProvideMockViewModels>
 * ```
 */
export function ProvideMockViewModels({ 
    mocks, 
    children 
}: { 
    mocks: ViewModelMock[];
    children: ReactNode;
}): ReactNode {
    return mocks.reduceRight<ReactNode>(
        (acc, mock) => {
            const ContextType = getOrCreateViewModelContext(mock._viewModelClass);
            return <ContextType.Provider value={mock._instance}>{acc}</ContextType.Provider>;
        },
        children
    );
}
