# Goal 5: CLI Tool

The objective of this goal is to provide a developer-friendly Command Line Interface (CLI) for interacting with the IRIS language. This will check, run, and manage IRIS programs easily.

## Roadmap

### Phase 1: Basic Structure & Entry Point
- [ ] Create `bin/iris` executable.
- [ ] Make `src/main.ts` (or `src/cli.ts`) the entry point for CLI args.
- [ ] Parse arguments (minimal, no external deps if possible, or `minimist`/`commander` if allowed - sticking to minimal for now as per "no deps" preference unless needed).

### Phase 2: Core Commands
- [ ] **`run <file>`**: Parse, type-check, and evaluate a file.
    - Support shebang `#!/usr/bin/env iris`?
- [ ] **`check <file>`**: Parse and type-check only (faster feedback loop).
- [ ] **`eval "code"`**: Evaluate string directly (optional but useful).

### Phase 3: Developer Experience (Polish)
- [ ] **`version`**: Output current version.
- [ ] **`help`**: Output usage instructions.
- [ ] **Error Reporting**: Pretty print errors with file names and line numbers (already partially done, but ensure CLI formats it nicely).

## Detailed Specification

```bash
# Run a file
$ iris run ./examples/server.iris

# Check a file (no eval)
$ iris check ./examples/server.iris
✅ No type errors found.

# Version
$ iris version
IRIS v0.4.0

# Help
$ iris help
Usage: iris [command] [options]
...
```

### Architecture
- **Entry**: `bin/iris` (Node.js script with `#!/usr/bin/env node`).
- **Logic**: `src/cli.ts` imports `src/main.ts` functions (`run`, `typecheck`).
- **Dependencies**: None preferred. standard `process.argv` handling.

## Verification
- Automated tests spawning the `iris` subprocess and checking stdout/stderr.
