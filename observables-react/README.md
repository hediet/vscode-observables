# @vscode/observables-react

React bindings for `@vscode/observables`. Provides patterns for building reactive React components with observable state.

> **Note:** React Strict Mode is not supported.

<!-- @codeblock-config
outDir: readme-codeblock-examples/out
-->

## Installation

```bash
npm install @vscode/observables @vscode/observables-react
```

## Core Patterns

### viewWithModel - The ViewModel Pattern

The recommended way to build components with observable state:

<!-- @codeblock
file: counter.tsx
postfix: |
  export { Counter, CounterModel };
additionalFiles:
  - suffix: .playwright-spec.tsx
    content: |
      import { test, expect } from '@playwright/experimental-ct-react';
      import { Counter } from './counter';

      test('counter increments and shows doubled value', async ({ mount }) => {
        const component = await mount(<Counter initialCount={5} label="Score" />);
        await expect(component).toContainText('Score: 5');
        await expect(component).toContainText('Doubled: 10');
        await component.getByRole('button', { name: '+' }).click();
        await expect(component).toContainText('Score: 6');
        await expect(component).toContainText('Doubled: 12');
      });
-->
```tsx
import { observableValue, derived, IReader } from '@vscode/observables';
import { ViewModel, viewWithModel, prop } from '@vscode/observables-react';

class CounterModel extends ViewModel({ initialCount: prop.const<number>() }) {
  public readonly count = observableValue(this, this.props.initialCount);
  public readonly doubled = derived(this, reader => this.count.read(reader) * 2);

  increment = () => this.count.set(this.count.get() + 1, undefined);

  override dispose(): void {
    // cleanup
    super.dispose();
  }
}

const Counter = viewWithModel(CounterModel, { label: prop<string>() }, (reader, model, props) => (
    <div>
      <span>{props.label.read(reader)}: {model.count.read(reader)}</span>
      <span>Doubled: {model.doubled.read(reader)}</span>
      <button onClick={model.increment}>+</button>
    </div>
  )
);

// Usage - both ViewModel props (initialCount) and view props (label) are merged
const example = <Counter initialCount={10} label="Score" />;
```

### view - Observable Props

Create components with typed observable props:

<!-- @codeblock display.tsx -->
```tsx
import { view, prop } from '@vscode/observables-react';

const Display = view(
  {
    label: prop<string>(),
    count: prop<number>(),
  },
  (reader, props) => (
    <div>
      <span>{props.label.read(reader)}</span>
      <span>{props.count.read(reader)}</span>
    </div>
  )
);

// Usage
const example = <Display label="Total" count={42} />;
```

### ObsView - Inline Observable Rendering

For embedding observable values in existing components:

<!-- @codeblock obsview.tsx -->
```tsx
import { observableValue } from '@vscode/observables';
import { ObsView } from '@vscode/observables-react';

const count = observableValue('count', 0);

function App() {
  return (
    <div>
      <ObsView>{reader => <span>{count.read(reader)}</span>}</ObsView>
      <button onClick={() => count.set(count.get() + 1, undefined)}>+</button>
    </div>
  );
}
```

### val - Observable to JSX Helper

Render an observable value inline:

<!-- @codeblock val.tsx -->
```tsx
import { observableValue } from '@vscode/observables';
import { val } from '@vscode/observables-react';

const message = observableValue('msg', 'Hello');

function App() {
  return <div>{val(message)}</div>;
}
```

## Property Transformers

Property transformers control how props are passed to `view`, `viewWithModel`, and `ViewModel`. They define both the input type (what React receives) and the output type (what your render function or ViewModel sees).

### For `view` and `viewWithModel` props

<!-- @codeblock property-transformers.tsx -->
```tsx
import { view, prop } from '@vscode/observables-react';

const MyComponent = view(
  {
    // prop<T>() - input: T, output: IObservable<T>
    // No re-render when value changes, read via observable
    name: prop<string>(),
    
    // prop.const<T>() - input: T, output: T
    // Re-renders when value changes, available directly
    label: prop.const<string>(),
    
    // prop.obs<T>() - input: T | IObservable<T>, output: IObservable<T>
    // Accepts either, normalizes to observable (slightly more expensive)
    value: prop.obs<number>(),
  },
  (reader, props) => (
    <div>
      <span>{props.name.read(reader)}</span>
      <span>{props.label}</span>
      <span>{props.value.read(reader)}</span>
    </div>
  )
);
```

### For `ViewModel` constructor props

The same transformers work in `ViewModel()`, making them available via `this.props`:

- `prop.const<T>()` - When the value changes, the **ViewModel is disposed and recreated**. Use for identity/key-like props. Has a slight performance advantage when the value is not expected to change (no observable wrapper).
- `prop<T>()` - Changes update the observable without recreating the ViewModel. Use for values that change during the ViewModel's lifetime.

<!-- @codeblock
file: viewmodel-props.tsx
prefix: |
  import { observableValue, IObservable } from '@vscode/observables';
  import { ViewModel, prop } from '@vscode/observables-react';
-->
```tsx
class MyModel extends ViewModel({
  initialValue: prop.const<number>(),  // if this changes, MyModel is recreated
  config: prop<string>(),              // changes update this.props.config observable
}) {
  readonly value = observableValue(this, this.props.initialValue);
}
```

### `inject` - DI transformer for ViewModels

`inject(key)` is a special transformer that resolves a service from the DI container:

<!-- @codeblock
file: inject-snippet.tsx
prefix: |
  import { observableValue } from '@vscode/observables';
  import { ViewModel, inject, createServiceKey } from '@vscode/observables-react';
  class AppModel {
    userName = observableValue(this, '');
    login = (_userName: string) => {};
  }
-->
```tsx
const $AppModel = createServiceKey(AppModel);

class LoginViewModel extends ViewModel({
  appModel: inject($AppModel),  // resolved from DIContainer, available as this.props.appModel
}) {
  public readonly userName = observableValue(this, '');
  login = () => this.props.appModel.login(this.userName.get());
}
```

- Input: optional (can be passed explicitly for testing)
- Output: the service instance
- Requires a `DIProvider` ancestor in the component tree

## Dependency Injection

Built-in DI support for ViewModels:

<!-- @codeblock di.tsx -->
```tsx
import { observableValue } from '@vscode/observables';
import { 
  createServiceKey, DIContainer, DIProvider, inject,
  ViewModel, viewWithModel 
} from '@vscode/observables-react';

// The AppModel, for simple apps the central piece for the business logic
class AppModel {
  public readonly currentUser = observableValue<string | undefined>(this, undefined);
  login = (userName: string) => this.currentUser.set(userName, undefined);
  dispose() {} // Required for DisposableStore
}

const $AppModel = createServiceKey(AppModel);

// RootViewModel - sets up DI and provides services.
class RootViewModel extends ViewModel() {
  private readonly _appModel = this._store.add(new AppModel());
  public readonly container = new DIContainer()
    .register($AppModel, this._appModel);
}

// use `inject` to get the instance. It's private to the view model.
// The view model acts as an isolating bridge between the app model and the view.
class LoginViewModel extends ViewModel({ appModel: inject($AppModel) }) {
  public readonly userName = observableValue(this, '');
  login = () => this.props.appModel.login(this.userName.get());
}

// Root component provides DI context
const Root = viewWithModel(RootViewModel, (_reader, model) => (
  <DIProvider container={model.container}>
    <LoginPage />
  </DIProvider>
));

const LoginPage = viewWithModel(LoginViewModel, (reader, model) => (
  <div>
    <input 
      value={model.userName.read(reader)} 
      onChange={e => model.userName.set(e.target.value, undefined)} 
    />
    <button onClick={model.login}>Login</button>
  </div>
));
```

## Testing with Mock ViewModels

Override ViewModel instances for testing:

<!-- @codeblock
file: testing.tsx
prefix: |
  import { observableValue, derived } from '@vscode/observables';
  import { ViewModel, viewWithModel, prop, ProvideMockViewModels, mockViewModel } from '@vscode/observables-react';
  
  class CounterModel extends ViewModel({ initialCount: prop.const<number>() }) {
    public readonly count = observableValue(this, this.props.initialCount);
    increment = () => this.count.set(this.count.get() + 1, undefined);
  }
  const Counter = viewWithModel(CounterModel, (reader, model) => (
    <div><span>{model.count.read(reader)}</span></div>
  ));
-->
```tsx
const mockModel = new CounterModel({ initialCount: 0 });
mockModel.count.set(42, undefined);

const example = (
  <ProvideMockViewModels mocks={[mockViewModel(CounterModel, mockModel)]}>
    <Counter initialCount={0} />
  </ProvideMockViewModels>
);
```

## Router (Experimental)

Type-safe routing utilities:

<!-- @codeblock router.tsx -->
```tsx
import { Route, Router } from '@vscode/observables-react';

const homeRoute = Route.create('/');
const userRoute = Route.create('/users/:id', { id: 'string' });

const router = Router.create<string>()
  .with(homeRoute, () => 'home')
  .with(userRoute, (args) => `user-${args.id}`);
```

## API Reference

### Components & Views

- `viewWithModel(ModelClass, props, render)` - Create component with ViewModel
- `view(props, render)` - Create component with observable props
- `ObsView` - Inline observable rendering component
- `Value` - Render observable as component
- `val(observable)` - Render observable inline

### ViewModel

- `ViewModel(props)` - Base class factory for ViewModels
- `BaseViewModel` - Base class with disposable store
- `ProvideMockViewModels` - Override multiple ViewModels for testing
- `mockViewModel(Class, instance)` - Create mock binding for ProvideMockViewModels
- `ProvideViewModel` - Override single ViewModel for testing (low-level)

### Property Transformers

- `prop<T>()` - Transform to `IObservable<T>`
- `prop.const<T>()` - Pass through as `T`
- `prop.obs<T>()` - Normalize to `IObservable<T>`

### Dependency Injection

- `createServiceKey<T>(name)` or `createServiceKey(Class)` - Create typed service identifier
- `DIContainer` - Service container
- `DIProvider` - React context provider
- `inject(key)` - Property transformer for injection

## License

MIT
