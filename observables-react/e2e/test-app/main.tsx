import React from 'react';
import ReactDOM from 'react-dom/client';
import { observableValue, derived, IReader, IDisposable } from '@vscode/observables';
import { obsView, ObsView, view, viewWithModel, ViewModel, prop, val } from '../../src';

// ============================================================================
// Test Component 1: Basic obsView with counter
// ============================================================================
const BasicCounter = obsView<{ initialValue?: number }>('BasicCounter', (props) => {
    const owner = { toString: () => 'BasicCounter' };
    const count = observableValue(owner, props.get().initialValue ?? 0);

    return (reader: IReader) => (
        <div data-testid="basic-counter">
            <span data-testid="count-value">{count.read(reader)}</span>
            <button data-testid="increment-btn" onClick={() => count.set(count.get() + 1, undefined)}>+</button>
            <button data-testid="decrement-btn" onClick={() => count.set(count.get() - 1, undefined)}>-</button>
        </div>
    );
});

// ============================================================================
// Test Component 2: ObsView inline rendering
// ============================================================================
const globalCounterOwner = { toString: () => 'globalCounter' };
const globalCounter = observableValue(globalCounterOwner, 0);

function ObsViewTest() {
    return (
        <div data-testid="obsview-test">
            <ObsView>
                {(reader) => (
                    <span data-testid="obsview-value">{globalCounter.read(reader)}</span>
                )}
            </ObsView>
            <button
                data-testid="obsview-increment"
                onClick={() => globalCounter.set(globalCounter.get() + 1, undefined)}
            >
                Increment Global
            </button>
        </div>
    );
}

// ============================================================================
// Test Component 3: Derived values
// ============================================================================
const DerivedTest = obsView<{}>('DerivedTest', () => {
    const owner = { toString: () => 'DerivedTest' };
    const base = observableValue(owner, 5);
    const doubled = derived(owner, (reader) => base.read(reader) * 2);
    const tripled = derived(owner, (reader) => base.read(reader) * 3);

    return (reader: IReader) => (
        <div data-testid="derived-test">
            <span data-testid="base-value">{base.read(reader)}</span>
            <span data-testid="doubled-value">{doubled.read(reader)}</span>
            <span data-testid="tripled-value">{tripled.read(reader)}</span>
            <button data-testid="base-increment" onClick={() => base.set(base.get() + 1, undefined)}>
                Increment Base
            </button>
        </div>
    );
});

// ============================================================================
// Test Component 4: view() helper with props
// ============================================================================
const ViewWithProps = view(
    {
        label: prop<string>(),
        count: prop<number>(),
    },
    (reader, props) => (
        <div data-testid="view-with-props">
            <span data-testid="view-label">{props.label.read(reader)}</span>
            <span data-testid="view-count">{props.count.read(reader)}</span>
        </div>
    )
);

// ============================================================================
// Test Component 5: viewWithModel
// ============================================================================
class CounterModel extends ViewModel({}) implements IDisposable {
    public readonly count = observableValue(this, 0);
    public readonly isEven = derived(this, (reader) => this.count.read(reader) % 2 === 0);

    increment = () => this.count.set(this.count.get() + 1, undefined);
    decrement = () => this.count.set(this.count.get() - 1, undefined);

    dispose(): void {
        super.dispose();
    }
}

const ModelCounter = viewWithModel(
    CounterModel,
    {},
    (reader, model) => (
        <div data-testid="model-counter">
            <span data-testid="model-count">{model.count.read(reader)}</span>
            <span data-testid="model-is-even">{model.isEven.read(reader) ? 'even' : 'odd'}</span>
            <button data-testid="model-increment" onClick={model.increment}>+</button>
            <button data-testid="model-decrement" onClick={model.decrement}>-</button>
        </div>
    )
);

// ============================================================================
// Test Component 6: val() helper
// ============================================================================
const valTestOwner = { toString: () => 'valTest' };
const valTestObservable = observableValue(valTestOwner, 'initial');

function ValHelperTest() {
    return (
        <div data-testid="val-helper-test">
            <span data-testid="val-output">{val(valTestObservable)}</span>
            <button
                data-testid="val-update"
                onClick={() => valTestObservable.set('updated', undefined)}
            >
                Update
            </button>
        </div>
    );
}

// ============================================================================
// Test Component 7: prop.const and prop.obs
// ============================================================================
const PropVariantsTest = view(
    {
        constValue: prop.const<string>(),
        obsValue: prop.obs<string>(),
    },
    (reader, props) => (
        <div data-testid="prop-variants-test">
            <span data-testid="const-value">{props.constValue}</span>
            <span data-testid="obs-value">{props.obsValue.read(reader)}</span>
        </div>
    )
);

const observableStringOwner = { toString: () => 'obsString' };
const observableString = observableValue(observableStringOwner, 'observable-value');

// ============================================================================
// Test Component 8: Multiple re-renders tracking
// ============================================================================
let renderCount = 0;
const RenderTracker = obsView<{}>('RenderTracker', () => {
    const owner = { toString: () => 'RenderTracker' };
    const value = observableValue(owner, 0);

    return (reader: IReader) => {
        renderCount++;
        return (
            <div data-testid="render-tracker">
                <span data-testid="tracker-value">{value.read(reader)}</span>
                <span data-testid="render-count">{renderCount}</span>
                <button data-testid="tracker-update" onClick={() => value.set(value.get() + 1, undefined)}>
                    Update
                </button>
            </div>
        );
    };
});

// ============================================================================
// Main App
// ============================================================================
function App() {
    const [viewPropsLabel, setViewPropsLabel] = React.useState('Hello');
    const [viewPropsCount, setViewPropsCount] = React.useState(42);

    return (
        <div>
            <h1>Observables React Test App</h1>

            <section>
                <h2>Basic Counter (obsView)</h2>
                <BasicCounter initialValue={10} />
            </section>

            <section>
                <h2>ObsView Inline</h2>
                <ObsViewTest />
            </section>

            <section>
                <h2>Derived Values</h2>
                <DerivedTest />
            </section>

            <section>
                <h2>View with Props</h2>
                <ViewWithProps label={viewPropsLabel} count={viewPropsCount} />
                <button
                    data-testid="update-view-props"
                    onClick={() => {
                        setViewPropsLabel('Updated');
                        setViewPropsCount(100);
                    }}
                >
                    Update Props
                </button>
            </section>

            <section>
                <h2>Model Counter (viewWithModel)</h2>
                <ModelCounter />
            </section>

            <section>
                <h2>Val Helper</h2>
                <ValHelperTest />
            </section>

            <section>
                <h2>Prop Variants</h2>
                <PropVariantsTest constValue="constant" obsValue={observableString} />
                <button
                    data-testid="update-obs-prop"
                    onClick={() => observableString.set('updated-observable', undefined)}
                >
                    Update Observable Prop
                </button>
            </section>

            <section>
                <h2>Render Tracker</h2>
                <RenderTracker />
            </section>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
