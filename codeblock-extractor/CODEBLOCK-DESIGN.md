# md-codeblock Design Document

A tool to extract and verify code blocks from Markdown documentation.

## Vision

Make code blocks in Markdown feel like real code:
- **Type checking**: Code blocks are extracted and compiled
- **Testing**: Code blocks can include tests (in postfix)
- **Language services** (future): Hover, completions, diagnostics via editor projection

## Annotation Syntax

Two directives: `@codeblock` and `@codeblock-config`, both using YAML.

### Parsing Rules

The content after `@codeblock` or `@codeblock-config` until `-->` is parsed as YAML:

```
<!-- @codeblock YAML_CONTENT -->
```

**Single-line shorthand**: If content is just a filename (contains `.`, no `:`), it's treated as `file: <filename>`:

```markdown
<!-- @codeblock counter.tsx -->      →  { file: "counter.tsx" }
<!-- @codeblock -->                  →  {}
```

**Inline YAML**: Standard YAML flow syntax works:

```markdown
<!-- @codeblock file: counter.tsx -->
<!-- @codeblock { file: counter.tsx, skip: true } -->
```

**Multi-line YAML**: For complex configs:

```markdown
<!-- @codeblock
file: counter.tsx
postfix: |
  export { Counter };
-->
```

## TypeScript Interfaces

```typescript
interface CodeblockConfig {
  /** Output directory for generated files (default: ".examples") */
  outDir?: string;
  /** Default prefix prepended to all files */
  prefix?: string;
  /** Default postfix appended to all files */
  postfix?: string;
}

interface CodeblockAnnotation {
  /** Output filename. If omitted: continue previous file, or auto-generate */
  file?: string;
  /** Prefix for this file (extends default) */
  prefix?: string;
  /** Postfix for this file (extends default) */
  postfix?: string;
  /** Sequential replacements */
  replace?: Replacement[];
  /** Skip this block (documentation only) */
  skip?: boolean;
  /** Additional files generated alongside the main file */
  additionalFiles?: AdditionalFile[];
}

interface AdditionalFile {
  /** Suffix appended to base filename (e.g., ".spec.tsx" → "counter.spec.tsx") */
  suffix: string;
  /** Content of the additional file */
  content: string;
}

/** Flexible replacement format - all three styles supported */
type Replacement =
  | { find: string; with: string }  // Object style (most readable)
  | [string, string]                 // Tuple style (compact)
  | string;                          // Single string (for find-only, replace with "")
```

## Annotation Examples

### Document-level config

````markdown
<!-- @codeblock-config
outDir: .examples
prefix: |
  import React from 'react';
  import { observableValue } from '@vscode/observables';
-->
````

### Code block annotation (various styles)

````markdown
<!-- @codeblock counter.tsx -->
```tsx
class Counter { }
```

<!-- @codeblock file: display.tsx -->
```tsx
const Display = view({});
```

<!-- @codeblock
file: complex.tsx
postfix: |
  export { MyComponent };
-->
```tsx
const MyComponent = () => <div/>;
```
````

### Continuation (append to previous file)

````markdown
<!-- @codeblock -->
```tsx
// continues the previous file
```
````

### Auto-generated filename

If no `file:` is specified and there's no previous file to continue:

````markdown
<!-- @codeblock -->
```tsx
const x = 1;
```
````

→ Generates `snippet-1.tsx` (number increments, extension from language)

## Replace Syntax

Three formats supported, all processed sequentially (each pattern matched once, in order):

**Object style (most readable):**
```yaml
replace:
  - find: "..."
    with: "// implementation"
  - find: "..."
    with: |
      // multi-line
      doSomething();
```

**Tuple style (compact):**
```yaml
replace:
  - ["...", "// impl 1"]
  - ["...", "// impl 2"]
```

**Mixed:**
```yaml
replace:
  - find: "// TODO"
    with: "// DONE"
  - ["...", "// quick replacement"]
```

## Full Example

`````markdown
<!-- @codeblock-config
outDir: .examples
-->

## Counter Example

<!-- @codeblock
file: counter.tsx
postfix: |
  export { Counter, CounterModel };
additionalFiles:
  - suffix: .spec.tsx
    content: |
      import { test, expect } from '@playwright/experimental-ct-react';
      import { Counter, CounterModel } from './counter';

      test('counter increments', async ({ mount }) => {
        const c = await mount(<Counter initialCount={0} label="Score" />);
        await c.getByRole('button').click();
        await expect(c).toContainText('Score: 1');
      });
-->
```tsx
class CounterModel extends ViewModel() {
  public readonly count = observableValue(this, 0);
}
```

Some explanation text here...

<!-- @codeblock -->
```tsx
const Counter = viewWithModel(CounterModel, (reader, model) => (
  <div>{model.count.read(reader)}</div>
));
```

## Display Example

<!-- @codeblock display.tsx -->
```tsx
const Display = view({}, () => <div/>);
```
`````

This generates:
- `.examples/counter.tsx` - The main component
- `.examples/counter.spec.tsx` - Playwright test file (prefix + content)
- `.examples/display.tsx` - Another component

## Processing Rules

1. **File grouping**: Blocks with the same `file:` value are concatenated in document order
2. **Continuation**: `<!-- @codeblock -->` without `file:` continues the most recent file
3. **Auto-naming**: If no file context, generate `snippet-{N}.{lang}` where N increments
4. **Prefix/postfix**: Applied once per file (prefix at start, postfix at end)
5. **Replacements**: Applied to each block individually, in order

## Generated File Structure

```
.examples/
├── counter.tsx       # From file: counter.tsx
├── counter.spec.tsx  # From additionalFiles with suffix: .spec.tsx
├── display.tsx       # From file: display.tsx
├── snippet-1.tsx     # Auto-generated
└── snippet-2.tsx     # Auto-generated
```

## CLI Design

```bash
# Extract all code blocks from markdown files
md-codeblock extract README.md

# Extract with custom output directory  
md-codeblock extract README.md --outdir .examples

# Check that generated files are up-to-date (for CI)
md-codeblock check README.md

# Watch mode - regenerate on changes
md-codeblock watch README.md
```

## VS Code Extension: Editor Projection (Future)

Rather than source maps (which language services don't natively support), we use **editor projection** - a technique where we create a virtual "projected" editor that syncs with the markdown.

Inspired by [vscode-hediet-power-tools MarkdownEditorProjection](https://github.com/hediet/vscode-hediet-power-tools/blob/master/src/features/MarkdownEditorProjection/MarkdownEditorProjection.ts).

### How it works

1. **Virtual Document**: For each code block in markdown, maintain a virtual TypeScript/TSX document
2. **Bidirectional Sync**: Edits in markdown update the virtual doc; language service responses map back
3. **Position Mapping**: Track line/column offsets between markdown and generated content

```
┌─────────────────────────────────────────────────────────────────┐
│  README.md (VS Code)                                            │
│                                                                 │
│  ```tsx                                                         │
│  class Counter extends ViewModel() {                            │
│    count = observableValue(this, 0);                            │
│                              ▲                                  │
│                              │ hover info from projected doc    │
│  }                                                              │
│  ```                                                            │
└─────────────────────────────────────────────────────────────────┘
        │                                          ▲
        │ sync edits                               │ map diagnostics/hover
        ▼                                          │
┌─────────────────────────────────────────────────────────────────┐
│  (virtual) .examples/counter.tsx                                │
│                                                                 │
│  import { ViewModel, observableValue } from '...';  // prefix   │
│  class Counter extends ViewModel() {                            │
│    count = observableValue(this, 0);                            │
│  }                                                              │
│  export { Counter };                             // postfix     │
└─────────────────────────────────────────────────────────────────┘
```

### Features enabled

- **Diagnostics**: TypeScript errors shown inline in markdown code blocks
- **Hover**: Type information on hover
- **Completions**: Full autocomplete in code blocks
- **Go to Definition**: Navigate from markdown to source
- **Quick Fixes**: Apply TS quick fixes directly in markdown

## Implementation Phases

### Phase 1: CLI Core (current)
- Parse markdown, extract blocks + annotations
- Generate output files
- `extract` and `check` commands

### Phase 2: Watch Mode
- File watching for development
- Incremental regeneration

### Phase 3: VS Code Extension - Editor Projection
- Virtual document provider
- Position mapping
- Diagnostic forwarding

### Phase 4: Full Language Features
- Completions
- Hover
- Go to definition
- Quick fixes

## Open Questions

1. Should `prefix`/`postfix` in `@codeblock` replace or extend the default? → **Extend**
2. How to handle multiple markdown files with overlapping output files?
3. Should we support `include:` to pull in external files?
4. Config file format (`codeblock.config.json`) for project-level settings?
