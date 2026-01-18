import React from 'react';
import { observableValue, IReader, IObservable } from '@vscode/observables';
import { viewWithModel, ViewModel, DIContainer, DIProvider, createServiceKey, inject, ProvideViewModel } from '../../src';

export function DITestSection() {
    const [{ diContainer, childContainer }] = React.useState(() => {
        const count = observableValue('', 0);
        const diContainer = new DIContainer();

        diContainer.register(GreetingServiceKey, {
            greet: (name: string) => `Hello, ${name}!`,
        });

        diContainer.register(CounterServiceKey, {
            count,
            increment() { count.set(count.get() + 1, undefined); },
        });

        const childContainer = diContainer.createChild();
        childContainer.register(GreetingServiceKey, {
            greet: (name: string) => `Hi there, ${name}!`,
        });
        return {
            diContainer,
            childContainer,
        };
    });

    return (
        <>
            <section>
                <h2>Dependency Injection</h2>
                <DIProvider container={diContainer}>
                    <DITestView />
                </DIProvider>
            </section>

            <section>
                <h2>Child Container (Nested DI)</h2>
                <DIProvider container={childContainer}>
                    <DITestView />
                </DIProvider>
            </section>
        </>
    );
}

interface IGreetingService {
    greet(name: string): string;
}
export const GreetingServiceKey = createServiceKey<IGreetingService>('GreetingService');

interface ICounterService {
    readonly count: IObservable<number>;
    increment(): void;
}
export const CounterServiceKey = createServiceKey<ICounterService>('CounterService');


class DITestModel extends ViewModel({
    greetingService: inject(GreetingServiceKey),
    counterService: inject(CounterServiceKey),
}) {
    public readonly name = observableValue(this, 'World');

    getGreeting(reader: IReader): string {
        return this.props.greetingService.greet(this.name.read(reader));
    }

    setName(name: string): void {
        this.name.set(name, undefined);
    }

    incrementCounter(): void {
        this.props.counterService.increment();
    }

    getCount(reader: IReader): number {
        return this.props.counterService.count.read(reader);
    }
}

const DITestView = viewWithModel(
    DITestModel,
    {},
    (reader, model) => (
        <div data-testid="di-test">
            <span data-testid="di-greeting">{model.getGreeting(reader)}</span>
            <span data-testid="di-counter">{model.getCount(reader)}</span>
            <input
                data-testid="di-name-input"
                value={model.name.read(reader)}
                onChange={(e) => model.setName(e.target.value)}
            />
            <button data-testid="di-increment" onClick={() => model.incrementCounter()}>
                Increment
            </button>
        </div>
    )
);

// Test: inject() used directly in viewWithModel props (not ViewModel)
// This tests that injected props work in the view's props parameter, not just the model
class SimpleModel extends ViewModel({}) { }

const DirectInjectView = viewWithModel(
    SimpleModel,
    { greetingService: inject(GreetingServiceKey) },
    (_reader, _model, props) => (
        <div data-testid="direct-inject-test">
            <span data-testid="direct-inject-greeting">{props.greetingService.greet('Direct')}</span>
        </div>
    )
);

export function DirectInjectTestSection() {
    const [diContainer] = React.useState(() => {
        const container = new DIContainer();
        container.register(GreetingServiceKey, {
            greet: (name: string) => `Directly injected: ${name}!`,
        });
        return container;
    });

    return (
        <section>
            <h2>Direct Inject in Props</h2>
            <DIProvider container={diContainer}>
                {/* Should compile without passing greetingService - it's injected */}
                <DirectInjectView />

                {/* Explicit prop overrides DI injection */}
                <DirectInjectView greetingService={{ greet: (name: string) => `Explicit prop: ${name}!` }} />
            </DIProvider>
        </section>
    );
}

// Test: ProvideViewModel allows overriding the entire ViewModel for testing
class OverridableModel extends ViewModel({}) {
    public readonly message = observableValue(this, 'Default message');
    
    getMessage(reader: IReader): string {
        return this.message.read(reader);
    }
}

const OverridableView = viewWithModel(
    OverridableModel,
    {},
    (reader, model) => (
        <div data-testid="overridable-view">
            <span data-testid="overridable-message">{model.getMessage(reader)}</span>
        </div>
    )
);

export function ProvideViewModelTestSection() {
    // Create a mock model for testing
    const [mockModel] = React.useState(() => {
        const model = {
            message: observableValue({}, 'Mocked message from ProvideViewModel!'),
            getMessage(reader: IReader): string {
                return this.message.read(reader);
            },
            dispose() {},
        };
        return model;
    });

    return (
        <section>
            <h2>ProvideViewModel (Testing Override)</h2>
            
            {/* Normal usage - creates its own model */}
            <div>
                <h3>Normal (creates own model):</h3>
                <OverridableView />
            </div>
            
            {/* With ProvideViewModel - uses the provided mock */}
            <div>
                <h3>With ProvideViewModel (uses mock):</h3>
                <ProvideViewModel viewModel={OverridableModel} value={mockModel}>
                    <OverridableView />
                </ProvideViewModel>
            </div>
        </section>
    );
}
