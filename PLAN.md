# Repository Setup Plan

## Current Status
- **Git**: Initialized on `main` branch, but **no commits yet**
- **Missing**: `.gitignore`, `README.md`
- **Build Status**: ❌ Failing with 18+ TypeScript errors

---

## Tasks

### 1. Project Setup
- [ ] Create `.gitignore` file (exclude `node_modules/`, `dist/`, etc.)
- [ ] Create `README.md` with project description, setup instructions, and usage
- [ ] Create initial commit with all files

### 2. Fix Build Errors (`npm run build`)

The build is failing in the `observables` package with these issues:

#### Missing Files/Exports
- [ ] **Missing `lifecycle.js`**: `observableInternal/logging/debugger/utils.ts` imports `IDisposable` from `../../../lifecycle.js` which doesn't exist
  - Should import from `../../../disposables.js` instead
- [ ] **Missing `observable.js`**: `map.ts` and `set.ts` import from `../observable.js` which doesn't exist
  - Should import from `./index.js` or re-export from the correct location
- [ ] **Missing `cancelOnDispose`**: `runOnChange.ts` imports `cancelOnDispose` from `cancellation.ts` but it's not exported
  - Need to implement and export `cancelOnDispose` function

#### Type Errors
- [ ] **`Timeout` type undefined**: Used in multiple files (`utils.ts`, `debugger/utils.ts`)
  - Replace with `ReturnType<typeof setTimeout>` or define a type alias
- [ ] **Type errors in `utils.ts`**: `autorunHandleChanges` call has incorrect options shape
  - The `createEmptyChangeSummary` and `handleChange` may need different structure
- [ ] **`CancellationTokenSource.dispose(true)`**: Called with argument but method accepts none
  - In `utilsCancellation.ts` line 90
- [ ] **`Event.fromObservableLight`**: Property doesn't exist on `Event`
  - In `valueWithChangeEvent.ts` - this seems like a VS Code-specific API that needs to be stubbed or removed

### 3. Documentation & Configuration
- [ ] Add LICENSE file (MIT based on code headers)
- [ ] Review and update `package.json` metadata (repository, keywords, license field)
- [ ] Consider adding `.editorconfig` for consistent formatting
- [ ] Consider adding `.npmrc` for npm configuration

### 4. Development Experience
- [ ] Add ESLint configuration for code quality
- [ ] Add Prettier configuration for formatting
- [ ] Consider adding pre-commit hooks (husky + lint-staged)
- [ ] Add basic unit tests setup

### 5. CI/CD (Future)
- [ ] Add GitHub Actions workflow for CI (build + test)
- [ ] Add automated publishing workflow for npm packages

---

## Build Error Summary

```
npm run build errors:

1. TS2307: Cannot find module '../../../lifecycle.js' (debugger/utils.ts:6)
2. TS2304: Cannot find name 'Timeout' (multiple files)
3. TS2307: Cannot find module '../observable.js' (map.ts:6, set.ts:6)
4. TS2305: 'cancelOnDispose' not exported from cancellation.js (runOnChange.ts:7)
5. TS2554: Expected 0 arguments, got 1 for dispose() (utilsCancellation.ts:90)
6. TS2339: 'fromObservableLight' does not exist on Event (valueWithChangeEvent.ts:16)
7. TS2353/TS7006/TS18046: Type errors in utils.ts (lines 24-45)
```

---

## Recommended Order of Execution

1. **First**: Fix build errors (critical for usability)
2. **Second**: Add .gitignore (before committing)
3. **Third**: Create README.md
4. **Fourth**: Make initial commit
5. **Later**: Add tooling (ESLint, Prettier, tests, CI)

---

## Questions for You

1. Should I proceed with fixing the build errors first?
2. For the `Event.fromObservableLight` - is this meant to integrate with VS Code's event system? Should I stub it or remove that functionality?
3. Do you want a basic or comprehensive README?
4. Any specific license preference (MIT seems to be used based on file headers)?
