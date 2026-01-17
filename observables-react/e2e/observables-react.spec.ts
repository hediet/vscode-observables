import { test, expect } from '@playwright/test';

test.describe('observables-react', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
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
});
