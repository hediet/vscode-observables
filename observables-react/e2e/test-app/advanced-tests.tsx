import React from 'react';
import { observableValue, derived, transaction, IReader } from '@vscode/observables';
import { obsView, viewWithModel, ViewModel, prop, ObsView } from '../../src';

// ============================================================================
// Test: Transaction Batching
// ============================================================================
function createTransactionObservables() {
    const owner = { toString: () => 'transaction-test' };
    return {
        firstName: observableValue(owner, 'John'),
        lastName: observableValue(owner, 'Doe'),
    };
}

export function TransactionTestSection() {
    const observablesRef = React.useRef<ReturnType<typeof createTransactionObservables> | null>(null);
    if (!observablesRef.current) {
        observablesRef.current = createTransactionObservables();
    }
    const { firstName, lastName } = observablesRef.current;

    return (
        <section>
            <h2>Transaction Batching</h2>
            <div data-testid="transaction-test">
                <ObsView>
                    {(reader) => (
                        <span data-testid="transaction-full-name">
                            {firstName.read(reader)} {lastName.read(reader)}
                        </span>
                    )}
                </ObsView>
                <button 
                    data-testid="transaction-individual-update"
                    onClick={() => {
                        firstName.set('Jane', undefined);
                        lastName.set('Smith', undefined);
                    }}
                >
                    Individual Updates
                </button>
                <button 
                    data-testid="transaction-batched-update"
                    onClick={() => {
                        transaction(tx => {
                            firstName.set('Bob', tx);
                            lastName.set('Johnson', tx);
                        });
                    }}
                >
                    Batched Update
                </button>
                <button 
                    data-testid="transaction-reset"
                    onClick={() => {
                        transaction(tx => {
                            firstName.set('John', tx);
                            lastName.set('Doe', tx);
                        });
                    }}
                >
                    Reset
                </button>
            </div>
        </section>
    );
}

// ============================================================================
// Test: Chained Derived Values
// ============================================================================
export function ChainedDerivedTestSection() {
    return (
        <section>
            <h2>Chained Derived Values</h2>
            <ChainedDerivedTest />
        </section>
    );
}

const ChainedDerivedTest = obsView<{}>('ChainedDerivedTest', () => {
    const owner = { toString: () => 'ChainedDerivedTest' };
    const base = observableValue(owner, 2);
    const doubled = derived(owner, (reader) => base.read(reader) * 2);
    const quadrupled = derived(owner, (reader) => doubled.read(reader) * 2);
    const octupled = derived(owner, (reader) => quadrupled.read(reader) * 2);

    return (reader: IReader) => (
        <div data-testid="chained-derived-test">
            <span data-testid="chained-base">{base.read(reader)}</span>
            <span data-testid="chained-doubled">{doubled.read(reader)}</span>
            <span data-testid="chained-quadrupled">{quadrupled.read(reader)}</span>
            <span data-testid="chained-octupled">{octupled.read(reader)}</span>
            <button data-testid="chained-increment" onClick={() => base.set(base.get() + 1, undefined)}>
                Increment
            </button>
        </div>
    );
});

// ============================================================================
// Test: ViewModel with Props
// ============================================================================
export function ViewModelWithPropsTestSection() {
    const [initialCount, setInitialCount] = React.useState(10);
    const [multiplier, setMultiplier] = React.useState(2);

    return (
        <section>
            <h2>ViewModel with Props</h2>
            <ViewModelWithPropsComponent initialCount={initialCount} multiplier={multiplier} />
            <div>
                <button 
                    data-testid="vm-props-change-initial"
                    onClick={() => setInitialCount(prev => prev + 5)}
                >
                    Change Initial (+5)
                </button>
                <button 
                    data-testid="vm-props-change-multiplier"
                    onClick={() => setMultiplier(prev => prev + 1)}
                >
                    Change Multiplier (+1)
                </button>
            </div>
        </section>
    );
}

class PropsCounterModel extends ViewModel({
    initialCount: prop.const<number>(),
    multiplier: prop.const<number>(),
}) {
    public readonly count = observableValue(this, 0);
    public readonly multiplied = derived(this, (reader) => 
        this.count.read(reader) * this.props.multiplier
    );

    constructor(props: { initialCount: number; multiplier: number }) {
        super(props);
        this.count.set(props.initialCount, undefined);
    }

    increment = () => this.count.set(this.count.get() + 1, undefined);
}

const ViewModelWithPropsComponent = viewWithModel(
    PropsCounterModel,
    {},
    (reader, model) => (
        <div data-testid="vm-props-test">
            <span data-testid="vm-props-count">{model.count.read(reader)}</span>
            <span data-testid="vm-props-multiplied">{model.multiplied.read(reader)}</span>
            <button data-testid="vm-props-increment" onClick={model.increment}>+</button>
        </div>
    )
);

// ============================================================================
// Test: Conditional Rendering with Observables
// ============================================================================
export function ConditionalRenderTestSection() {
    return (
        <section>
            <h2>Conditional Rendering</h2>
            <ConditionalRenderTest />
        </section>
    );
}

const ConditionalRenderTest = obsView<{}>('ConditionalRenderTest', () => {
    const owner = { toString: () => 'ConditionalRenderTest' };
    const showDetails = observableValue(owner, false);
    const count = observableValue(owner, 0);

    return (reader: IReader) => (
        <div data-testid="conditional-test">
            <span data-testid="conditional-count">{count.read(reader)}</span>
            <button 
                data-testid="conditional-toggle"
                onClick={() => showDetails.set(!showDetails.get(), undefined)}
            >
                Toggle Details
            </button>
            <button 
                data-testid="conditional-increment"
                onClick={() => count.set(count.get() + 1, undefined)}
            >
                Increment
            </button>
            {showDetails.read(reader) && (
                <div data-testid="conditional-details">
                    <span data-testid="conditional-doubled">{count.read(reader) * 2}</span>
                    <span data-testid="conditional-squared">{count.read(reader) ** 2}</span>
                </div>
            )}
        </div>
    );
});

// ============================================================================
// Test: List Rendering with Observables
// ============================================================================
export function ListRenderTestSection() {
    return (
        <section>
            <h2>List Rendering</h2>
            <ListRenderTest />
        </section>
    );
}

interface ListItem {
    id: number;
    text: string;
}

const ListRenderTest = obsView<{}>('ListRenderTest', () => {
    const owner = { toString: () => 'ListRenderTest' };
    const items = observableValue<ListItem[]>(owner, [
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' },
        { id: 3, text: 'Third' },
    ]);
    let nextId = 4;

    return (reader: IReader) => (
        <div data-testid="list-test">
            <span data-testid="list-count">{items.read(reader).length}</span>
            <ul data-testid="list-items">
                {items.read(reader).map(item => (
                    <li key={item.id} data-testid={`list-item-${item.id}`}>
                        {item.text}
                    </li>
                ))}
            </ul>
            <button 
                data-testid="list-add"
                onClick={() => items.set([...items.get(), { id: nextId++, text: `Item ${nextId}` }], undefined)}
            >
                Add Item
            </button>
            <button 
                data-testid="list-remove-first"
                onClick={() => items.set(items.get().slice(1), undefined)}
            >
                Remove First
            </button>
            <button 
                data-testid="list-reverse"
                onClick={() => items.set([...items.get()].reverse(), undefined)}
            >
                Reverse
            </button>
        </div>
    );
});

// ============================================================================
// Test: Multiple Observables Interaction
// ============================================================================
export function MultipleObservablesTestSection() {
    return (
        <section>
            <h2>Multiple Observables Interaction</h2>
            <MultipleObservablesTest />
        </section>
    );
}

const MultipleObservablesTest = obsView<{}>('MultipleObservablesTest', () => {
    const owner = { toString: () => 'MultipleObservablesTest' };
    const a = observableValue(owner, 10);
    const b = observableValue(owner, 5);
    const operation = observableValue<'add' | 'subtract' | 'multiply'>(owner, 'add');
    
    const result = derived(owner, (reader) => {
        const aVal = a.read(reader);
        const bVal = b.read(reader);
        switch (operation.read(reader)) {
            case 'add': return aVal + bVal;
            case 'subtract': return aVal - bVal;
            case 'multiply': return aVal * bVal;
        }
    });

    return (reader: IReader) => (
        <div data-testid="multi-obs-test">
            <span data-testid="multi-obs-a">{a.read(reader)}</span>
            <span data-testid="multi-obs-b">{b.read(reader)}</span>
            <span data-testid="multi-obs-operation">{operation.read(reader)}</span>
            <span data-testid="multi-obs-result">{result.read(reader)}</span>
            <button data-testid="multi-obs-inc-a" onClick={() => a.set(a.get() + 1, undefined)}>A+</button>
            <button data-testid="multi-obs-inc-b" onClick={() => b.set(b.get() + 1, undefined)}>B+</button>
            <button data-testid="multi-obs-set-add" onClick={() => operation.set('add', undefined)}>Add</button>
            <button data-testid="multi-obs-set-subtract" onClick={() => operation.set('subtract', undefined)}>Sub</button>
            <button data-testid="multi-obs-set-multiply" onClick={() => operation.set('multiply', undefined)}>Mul</button>
        </div>
    );
});
