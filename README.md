# @vscode/observables

A lightweight, fine-grained reactive programming library for building observable state management. Originally developed for Visual Studio Code.

## Packages

This monorepo contains:

- **[@vscode/observables](./observables)** - Core observable primitives
- **[@vscode/observables-react](./observables-react)** - React bindings for observables

## Quick Start

### Installation

```bash
npm install @vscode/observables
```

For React integration:

```bash
npm install @vscode/observables @vscode/observables-react
```

### Basic Usage

```typescript
import { observableValue, derived, autorun } from '@vscode/observables';

// Create an observable value
const count = observableValue('count', 0);

// Create a derived observable
const doubled = derived('doubled', reader => {
  return count.read(reader) * 2;
});

// React to changes
const disposable = autorun(reader => {
  console.log('Count:', count.read(reader));
  console.log('Doubled:', doubled.read(reader));
});

// Update the value
count.set(5, undefined);
// Logs: Count: 5, Doubled: 10

// Cleanup
disposable.dispose();
```

### Transactions

Batch multiple changes to avoid intermediate updates:

```typescript
import { observableValue, transaction } from '@vscode/observables';

const firstName = observableValue('firstName', 'John');
const lastName = observableValue('lastName', 'Doe');

// Both changes are applied atomically
transaction(tx => {
  firstName.set('Jane', tx);
  lastName.set('Smith', tx);
});
```

### React Integration

```tsx
import { observableValue } from '@vscode/observables';
import { useObservable } from '@vscode/observables-react';

const count = observableValue('count', 0);

function Counter() {
  const value = useObservable(count);
  
  return (
    <button onClick={() => count.set(value + 1, undefined)}>
      Count: {value}
    </button>
  );
}
```

> **Note:** React Strict Mode is not supported by `@vscode/observables-react`.

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Run Example App

```bash
npm run dev -w example-observables-react
```

## API Overview

### Core Observables

- `observableValue(name, initialValue)` - Create a settable observable
- `derived(name, computeFn)` - Create a computed observable
- `constObservable(value)` - Create a constant observable

### Reactions

- `autorun(fn)` - Run a function whenever observed values change
- `runOnChange(observable, callback)` - React to specific observable changes

### Utilities

- `transaction(fn)` - Batch multiple updates
- `waitForState(observable, predicate)` - Await a specific state

## License

MIT - see [LICENSE](./LICENSE)
