import { test, expect } from '@playwright/test';

test.describe('observables-react', () => {
    let consoleErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        page.on('pageerror', (error) => {
            consoleErrors.push(error.message);
        });
        await page.goto('/');
    });

    test.afterEach(async () => {
        expect(consoleErrors, 'Console should have no errors').toEqual([]);
    });

    test.describe('obsView - Basic Counter', () => {
        test('renders with initial value', async ({ page }) => {
            const countValue = page.getByTestId('count-value');
            await expect(countValue).toHaveText('10');
        });

        test('increments count on button click', async ({ page }) => {
            const countValue = page.getByTestId('count-value');
            const incrementBtn = page.getByTestId('increment-btn');

            await expect(countValue).toHaveText('10');
            await incrementBtn.click();
            await expect(countValue).toHaveText('11');
            await incrementBtn.click();
            await expect(countValue).toHaveText('12');
        });

        test('decrements count on button click', async ({ page }) => {
            const countValue = page.getByTestId('count-value');
            const decrementBtn = page.getByTestId('decrement-btn');

            await expect(countValue).toHaveText('10');
            await decrementBtn.click();
            await expect(countValue).toHaveText('9');
        });
    });

    test.describe('ObsView - Inline Rendering', () => {
        test('renders observable value inline', async ({ page }) => {
            const obsViewValue = page.getByTestId('obsview-value');
            await expect(obsViewValue).toHaveText('0');
        });

        test('updates when observable changes', async ({ page }) => {
            const obsViewValue = page.getByTestId('obsview-value');
            const incrementBtn = page.getByTestId('obsview-increment');

            await incrementBtn.click();
            await expect(obsViewValue).toHaveText('1');
            await incrementBtn.click();
            await expect(obsViewValue).toHaveText('2');
        });
    });

    test.describe('Derived Values', () => {
        test('computes derived values correctly', async ({ page }) => {
            const baseValue = page.getByTestId('base-value');
            const doubledValue = page.getByTestId('doubled-value');
            const tripledValue = page.getByTestId('tripled-value');

            await expect(baseValue).toHaveText('5');
            await expect(doubledValue).toHaveText('10');
            await expect(tripledValue).toHaveText('15');
        });

        test('updates derived values when base changes', async ({ page }) => {
            const baseValue = page.getByTestId('base-value');
            const doubledValue = page.getByTestId('doubled-value');
            const tripledValue = page.getByTestId('tripled-value');
            const incrementBtn = page.getByTestId('base-increment');

            await incrementBtn.click();

            await expect(baseValue).toHaveText('6');
            await expect(doubledValue).toHaveText('12');
            await expect(tripledValue).toHaveText('18');
        });
    });

    test.describe('view() with Props', () => {
        test('renders props correctly', async ({ page }) => {
            const labelElement = page.getByTestId('view-label');
            const countElement = page.getByTestId('view-count');

            await expect(labelElement).toHaveText('Hello');
            await expect(countElement).toHaveText('42');
        });

        test('updates when props change', async ({ page }) => {
            const labelElement = page.getByTestId('view-label');
            const countElement = page.getByTestId('view-count');
            const updateBtn = page.getByTestId('update-view-props');

            await updateBtn.click();

            await expect(labelElement).toHaveText('Updated');
            await expect(countElement).toHaveText('100');
        });
    });

    test.describe('viewWithModel', () => {
        test('renders model state', async ({ page }) => {
            const modelCount = page.getByTestId('model-count');
            const modelIsEven = page.getByTestId('model-is-even');

            await expect(modelCount).toHaveText('0');
            await expect(modelIsEven).toHaveText('even');
        });

        test('updates model state on increment', async ({ page }) => {
            const modelCount = page.getByTestId('model-count');
            const modelIsEven = page.getByTestId('model-is-even');
            const incrementBtn = page.getByTestId('model-increment');

            await incrementBtn.click();

            await expect(modelCount).toHaveText('1');
            await expect(modelIsEven).toHaveText('odd');
        });

        test('derived values update correctly', async ({ page }) => {
            const modelCount = page.getByTestId('model-count');
            const modelIsEven = page.getByTestId('model-is-even');
            const incrementBtn = page.getByTestId('model-increment');

            await incrementBtn.click();
            await incrementBtn.click();

            await expect(modelCount).toHaveText('2');
            await expect(modelIsEven).toHaveText('even');
        });
    });

    test.describe('val() Helper', () => {
        test('renders observable value', async ({ page }) => {
            const valOutput = page.getByTestId('val-output');
            await expect(valOutput).toHaveText('initial');
        });

        test('updates when observable changes', async ({ page }) => {
            const valOutput = page.getByTestId('val-output');
            const updateBtn = page.getByTestId('val-update');

            await updateBtn.click();
            await expect(valOutput).toHaveText('updated');
        });
    });

    test.describe('prop.const and prop.obs', () => {
        test('renders constant and observable props', async ({ page }) => {
            const constValue = page.getByTestId('const-value');
            const obsValue = page.getByTestId('obs-value');

            await expect(constValue).toHaveText('constant');
            await expect(obsValue).toHaveText('observable-value');
        });

        test('updates observable prop when changed', async ({ page }) => {
            const obsValue = page.getByTestId('obs-value');
            const updateBtn = page.getByTestId('update-obs-prop');

            await updateBtn.click();
            await expect(obsValue).toHaveText('updated-observable');
        });
    });

    test.describe('Render Efficiency', () => {
        test('re-renders when observable changes', async ({ page }) => {
            const trackerValue = page.getByTestId('tracker-value');
            const renderCount = page.getByTestId('render-count');
            const updateBtn = page.getByTestId('tracker-update');

            const initialRenderCount = await renderCount.textContent();

            await updateBtn.click();
            await expect(trackerValue).toHaveText('1');

            const newRenderCount = await renderCount.textContent();
            expect(Number(newRenderCount)).toBeGreaterThan(Number(initialRenderCount));
        });
    });

    test.describe('Dependency Injection', () => {
        test('injects services into ViewModel', async ({ page }) => {
            const greeting = page.getByTestId('di-greeting').first();
            await expect(greeting).toHaveText('Hello, World!');
        });

        test('injected service responds to observable changes', async ({ page }) => {
            const greeting = page.getByTestId('di-greeting').first();
            const nameInput = page.getByTestId('di-name-input').first();

            await nameInput.fill('Playwright');
            await expect(greeting).toHaveText('Hello, Playwright!');
        });

        test('multiple services can be injected', async ({ page }) => {
            const counter = page.getByTestId('di-counter').first();
            const incrementBtn = page.getByTestId('di-increment').first();

            await expect(counter).toHaveText('0');
            await incrementBtn.click();
            await expect(counter).toHaveText('1');
            await incrementBtn.click();
            await expect(counter).toHaveText('2');
        });

        test('child container overrides parent service', async ({ page }) => {
            // Child container overrides GreetingService with "Hi there" instead of "Hello"
            const childGreeting = page.getByTestId('di-greeting').nth(1);
            await expect(childGreeting).toHaveText('Hi there, World!');
        });
    });

    test.describe('Direct Inject in Props', () => {
        test('injects service directly in viewWithModel props', async ({ page }) => {
            const greeting = page.getByTestId('direct-inject-greeting').first();
            await expect(greeting).toHaveText('Directly injected: Direct!');
        });

        test('explicit prop overrides DI injection', async ({ page }) => {
            // The second DirectInjectView has explicit greetingService prop
            const overriddenGreeting = page.getByTestId('direct-inject-greeting').nth(1);
            await expect(overriddenGreeting).toHaveText('Explicit prop: Direct!');
        });
    });

    test.describe('ProvideViewModel', () => {
        test('normal view creates its own model', async ({ page }) => {
            // First OverridableView (without ProvideViewModel) uses default message
            const normalMessage = page.getByTestId('overridable-message').first();
            await expect(normalMessage).toHaveText('Default message');
        });

        test('ProvideViewModel overrides the model', async ({ page }) => {
            // Second OverridableView (with ProvideViewModel) uses mocked message
            const mockedMessage = page.getByTestId('overridable-message').nth(1);
            await expect(mockedMessage).toHaveText('Mocked message from ProvideViewModel!');
        });
    });

    test.describe('Transaction Batching', () => {
        test('shows initial name', async ({ page }) => {
            const fullName = page.getByTestId('transaction-full-name');
            await expect(fullName).toHaveText('John Doe');
        });

        test('individual updates change the name', async ({ page }) => {
            const fullName = page.getByTestId('transaction-full-name');
            const individualBtn = page.getByTestId('transaction-individual-update');

            await individualBtn.click();
            await expect(fullName).toHaveText('Jane Smith');
        });

        test('batched updates change the name atomically', async ({ page }) => {
            const fullName = page.getByTestId('transaction-full-name');
            const batchedBtn = page.getByTestId('transaction-batched-update');

            await batchedBtn.click();
            await expect(fullName).toHaveText('Bob Johnson');
        });

        test('reset restores initial state', async ({ page }) => {
            const fullName = page.getByTestId('transaction-full-name');
            const batchedBtn = page.getByTestId('transaction-batched-update');
            const resetBtn = page.getByTestId('transaction-reset');

            await batchedBtn.click();
            await expect(fullName).toHaveText('Bob Johnson');
            
            await resetBtn.click();
            await expect(fullName).toHaveText('John Doe');
        });
    });

    test.describe('Chained Derived Values', () => {
        test('renders initial chained values correctly', async ({ page }) => {
            const base = page.getByTestId('chained-base');
            const doubled = page.getByTestId('chained-doubled');
            const quadrupled = page.getByTestId('chained-quadrupled');
            const octupled = page.getByTestId('chained-octupled');

            await expect(base).toHaveText('2');
            await expect(doubled).toHaveText('4');
            await expect(quadrupled).toHaveText('8');
            await expect(octupled).toHaveText('16');
        });

        test('updates all chained values when base changes', async ({ page }) => {
            const base = page.getByTestId('chained-base');
            const doubled = page.getByTestId('chained-doubled');
            const quadrupled = page.getByTestId('chained-quadrupled');
            const octupled = page.getByTestId('chained-octupled');
            const incrementBtn = page.getByTestId('chained-increment');

            await incrementBtn.click();

            await expect(base).toHaveText('3');
            await expect(doubled).toHaveText('6');
            await expect(quadrupled).toHaveText('12');
            await expect(octupled).toHaveText('24');
        });

        test('multiple increments update chain correctly', async ({ page }) => {
            const base = page.getByTestId('chained-base');
            const octupled = page.getByTestId('chained-octupled');
            const incrementBtn = page.getByTestId('chained-increment');

            await incrementBtn.click();
            await incrementBtn.click();
            await incrementBtn.click();

            await expect(base).toHaveText('5');
            await expect(octupled).toHaveText('40');
        });
    });

    test.describe('ViewModel with Props', () => {
        test('renders initial values from props', async ({ page }) => {
            const count = page.getByTestId('vm-props-count');
            const multiplied = page.getByTestId('vm-props-multiplied');

            await expect(count).toHaveText('10');
            await expect(multiplied).toHaveText('20'); // 10 * 2
        });

        test('increment updates count and multiplied value', async ({ page }) => {
            const count = page.getByTestId('vm-props-count');
            const multiplied = page.getByTestId('vm-props-multiplied');
            const incrementBtn = page.getByTestId('vm-props-increment');

            await incrementBtn.click();

            await expect(count).toHaveText('11');
            await expect(multiplied).toHaveText('22'); // 11 * 2
        });
    });

    test.describe('Conditional Rendering', () => {
        test('details hidden by default', async ({ page }) => {
            const details = page.getByTestId('conditional-details');
            await expect(details).not.toBeVisible();
        });

        test('toggle shows details', async ({ page }) => {
            const details = page.getByTestId('conditional-details');
            const toggleBtn = page.getByTestId('conditional-toggle');

            await toggleBtn.click();
            await expect(details).toBeVisible();
        });

        test('toggle hides details again', async ({ page }) => {
            const details = page.getByTestId('conditional-details');
            const toggleBtn = page.getByTestId('conditional-toggle');

            await toggleBtn.click();
            await expect(details).toBeVisible();
            
            await toggleBtn.click();
            await expect(details).not.toBeVisible();
        });

        test('derived values update when count changes', async ({ page }) => {
            const count = page.getByTestId('conditional-count');
            const toggleBtn = page.getByTestId('conditional-toggle');
            const incrementBtn = page.getByTestId('conditional-increment');

            await toggleBtn.click();
            
            const doubled = page.getByTestId('conditional-doubled');
            const squared = page.getByTestId('conditional-squared');

            await expect(count).toHaveText('0');
            await expect(doubled).toHaveText('0');
            await expect(squared).toHaveText('0');

            await incrementBtn.click();
            await incrementBtn.click();
            await incrementBtn.click();

            await expect(count).toHaveText('3');
            await expect(doubled).toHaveText('6');
            await expect(squared).toHaveText('9');
        });
    });

    test.describe('List Rendering', () => {
        test('renders initial list', async ({ page }) => {
            const listCount = page.getByTestId('list-count');
            const item1 = page.getByTestId('list-item-1');
            const item2 = page.getByTestId('list-item-2');
            const item3 = page.getByTestId('list-item-3');

            await expect(listCount).toHaveText('3');
            await expect(item1).toHaveText('First');
            await expect(item2).toHaveText('Second');
            await expect(item3).toHaveText('Third');
        });

        test('add item increases list', async ({ page }) => {
            const listCount = page.getByTestId('list-count');
            const addBtn = page.getByTestId('list-add');

            await addBtn.click();
            await expect(listCount).toHaveText('4');
            
            const item4 = page.getByTestId('list-item-4');
            await expect(item4).toBeVisible();
        });

        test('remove first removes item', async ({ page }) => {
            const listCount = page.getByTestId('list-count');
            const removeBtn = page.getByTestId('list-remove-first');

            await removeBtn.click();
            await expect(listCount).toHaveText('2');
            
            const item1 = page.getByTestId('list-item-1');
            await expect(item1).not.toBeVisible();
        });

        test('reverse changes order', async ({ page }) => {
            const items = page.getByTestId('list-items');
            const reverseBtn = page.getByTestId('list-reverse');

            await reverseBtn.click();
            
            // After reverse, the order should be Third, Second, First
            const listItems = items.locator('li');
            await expect(listItems.nth(0)).toHaveText('Third');
            await expect(listItems.nth(1)).toHaveText('Second');
            await expect(listItems.nth(2)).toHaveText('First');
        });
    });

    test.describe('Multiple Observables Interaction', () => {
        test('renders initial calculation (add)', async ({ page }) => {
            const a = page.getByTestId('multi-obs-a');
            const b = page.getByTestId('multi-obs-b');
            const operation = page.getByTestId('multi-obs-operation');
            const result = page.getByTestId('multi-obs-result');

            await expect(a).toHaveText('10');
            await expect(b).toHaveText('5');
            await expect(operation).toHaveText('add');
            await expect(result).toHaveText('15'); // 10 + 5
        });

        test('changing operation updates result', async ({ page }) => {
            const result = page.getByTestId('multi-obs-result');
            const subBtn = page.getByTestId('multi-obs-set-subtract');
            const mulBtn = page.getByTestId('multi-obs-set-multiply');

            await subBtn.click();
            await expect(result).toHaveText('5'); // 10 - 5

            await mulBtn.click();
            await expect(result).toHaveText('50'); // 10 * 5
        });

        test('changing operands updates result', async ({ page }) => {
            const result = page.getByTestId('multi-obs-result');
            const incABtn = page.getByTestId('multi-obs-inc-a');
            const incBBtn = page.getByTestId('multi-obs-inc-b');

            await incABtn.click();
            await expect(result).toHaveText('16'); // 11 + 5

            await incBBtn.click();
            await incBBtn.click();
            await expect(result).toHaveText('18'); // 11 + 7
        });

        test('complex interaction with operation and operand changes', async ({ page }) => {
            const result = page.getByTestId('multi-obs-result');
            const incABtn = page.getByTestId('multi-obs-inc-a');
            const mulBtn = page.getByTestId('multi-obs-set-multiply');
            const addBtn = page.getByTestId('multi-obs-set-add');

            // Start: 10 + 5 = 15
            await expect(result).toHaveText('15');

            // Increment A: 11 + 5 = 16
            await incABtn.click();
            await expect(result).toHaveText('16');

            // Change to multiply: 11 * 5 = 55
            await mulBtn.click();
            await expect(result).toHaveText('55');

            // Change back to add: 11 + 5 = 16
            await addBtn.click();
            await expect(result).toHaveText('16');
        });
    });
});
