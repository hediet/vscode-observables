# Repository Setup Plan

## Current Status
- **Git**: ✅ Initialized with initial commit
- **Build**: ✅ Passing
- **Bundler**: ✅ Rollup configured with dev/min outputs

---

## Tasks

### 1. Project Setup
- [x] Create `.gitignore` file (exclude `node_modules/`, `dist/`, etc.)
- [x] Create `README.md` with project description, setup instructions, and usage
- [x] Create initial commit with all files
- [x] Add `LICENSE` file (MIT)

### 2. Fix Build Errors (`npm run build`)
- [x] Fix missing `lifecycle.js` import → use `disposables`
- [x] Fix missing `observable.js` import → use `base`
- [x] Add `cancelOnDispose` export to `cancellation.ts`
- [x] Fix `Timeout` type → use `ReturnType<typeof setTimeout>`
- [x] Fix `dispose(true)` call → remove argument
- [x] Remove `Event.fromObservableLight` (VS Code specific API)
- [x] Fix type errors in `utils.ts`
- [x] Remove `.js` extensions from all imports

### 3. Bundling Setup
- [x] Configure Rollup for `@vscode/observables`
- [x] Configure Rollup for `@vscode/observables-react`
- [x] ESM output format
- [x] Sourcemaps enabled
- [x] Dev build (preserveModules)
- [x] Min build (terser)

### 4. Future Improvements
- [ ] Add ESLint configuration for code quality
- [ ] Add Prettier configuration for formatting
- [ ] Add pre-commit hooks (husky + lint-staged)
- [ ] Add basic unit tests setup
- [ ] Add GitHub Actions workflow for CI
- [ ] Add automated publishing workflow for npm packages

---

## Build Output

```
observables/dist/
├── index.js          # Dev entry (preserved modules)
├── index.js.map      # Sourcemap
├── index.d.ts        # Type declarations
├── index.min.js      # Minified bundle
├── index.min.js.map  # Minified sourcemap
└── ...               # Individual modules with declarations
```
