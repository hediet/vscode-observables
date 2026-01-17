import React from 'react';
import { observableValue, IReader, IObservable } from '@vscode/observables';
import { viewWithModel, ViewModel, DIContainer, DIProvider, createServiceKey, inject } from '../../src';

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
