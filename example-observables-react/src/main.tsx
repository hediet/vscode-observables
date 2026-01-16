import ReactDOM from 'react-dom/client';
import './index.css';
import { IDisposable, observableValue, derived, IReader } from '@vscode/observables';
import { ViewModel, viewWithModel } from '@vscode/observables-react';

function App() {
  return (
    <div className="app">
      <h1>VS Code Observables React Examples</h1>
      <Counter />
    </div>
  );
}

let idx = 0;

class CounterModel extends ViewModel({}) implements IDisposable {
  public readonly count = observableValue(this, 0);
  public readonly isEven = derived(this, (reader: IReader) => this.count.read(reader) % 2 === 0);
  public readonly canDecrement = derived(this, (reader: IReader) => this.count.read(reader) > 0);

  private readonly instanceId = ++idx;

  constructor(p: any) {
    super(p);

    console.log('CounterModel initialized', this.instanceId);
  }
  toString() {
    return `CounterModel#${this.instanceId}`;
  }

  increment = () => {
      console.log('Incrementing count', this.instanceId);
    this.count.set(this.count.get() + 1, undefined);
  };

  decrement = () => {
    console.log('Decrementing count', this.instanceId);
    if (this.count.get() > 0) {
      this.count.set(this.count.get() - 1, undefined);
    }
  };

  reset = () => {
    this.count.set(0, undefined);
  };

  dispose(): void {
    super.dispose();
    console.log('CounterModel disposed', this.instanceId);
  }
}

// Counter Component using viewWithModel
const Counter = viewWithModel(
  CounterModel,
  {},
  (reader: IReader, model: CounterModel) => (
    <div className="counter">
      <div className="counter-display">
        Count: {model.count.read(reader)}
        {model.isEven.read(reader) ? ' (Even)' : ' (Odd)'}
      </div>
      <div className="counter-controls">
        <button 
          onClick={model.decrement}
          disabled={!model.canDecrement.read(reader)}
        >
          -
        </button>
        <button onClick={model.reset}>Reset</button>
        <button onClick={model.increment}>+</button>
      </div>
    </div>
  )
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
