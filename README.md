# @vscode/observables

A lightweight, fine-grained reactive programming library for building observable state management. Originally developed for Visual Studio Code.

## Packages

- **[@vscode/observables](./observables)** - Core observable primitives (`observableValue`, `derived`, `autorun`, `transaction`)
- **[@vscode/observables-react](./observables-react)** - React bindings (`viewWithModel`, `ViewModel`, dependency injection)

## Quick Example

```typescript
import { observableValue, derived, autorun } from '@vscode/observables';

const count = observableValue('count', 0);
const doubled = derived('doubled', reader => count.read(reader) * 2);

autorun(reader => {
  console.log('Count:', count.read(reader), 'Doubled:', doubled.read(reader));
});

count.set(5, undefined); // Logs: Count: 5 Doubled: 10
```

### React

```tsx
import { observableValue } from '@vscode/observables';
import { ViewModel, viewWithModel } from '@vscode/observables-react';

class CounterModel extends ViewModel() {
  readonly count = observableValue(this, 0);
  increment = () => this.count.set(this.count.get() + 1, undefined);
}

const Counter = viewWithModel(CounterModel, (reader, model) => (
  <button onClick={model.increment}>Count: {model.count.read(reader)}</button>
));
```

See the package READMEs for full documentation.

## Development

```bash
npm install      # Setup
npm run build    # Build all packages
npm run dev -w example-observables-react  # Run example app
```

## License

MIT - see [LICENSE](./LICENSE)
