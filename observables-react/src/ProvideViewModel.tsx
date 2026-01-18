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
