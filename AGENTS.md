# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the TypeScript implementation: parser (`sexp`), typechecker, evaluator, runtime, and CLI entry points.
- `tests/` holds Iris language tests (`tNNN*.ts`) plus coverage-focused tests.
- `examples/` includes sample `.iris` programs used for demos and regression checks.
- `docs/` and `web/` host the static playground, docs, and bundled browser runtime (`iris.js`).
- `scripts/` contains build helpers (e.g., `scripts/build_web.js`).

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run build` compiles TypeScript to `dist/` (required for `bin/iris` CLI runs).
- `npm test` runs the main test suite via `src/tests.ts`.
- `npm run test:coverage` runs tests with `c8` coverage reporting.
- `node scripts/build_web.js` rebuilds `web/iris.js`/`web/iris.js.map` for the playground.

## Coding Style & Naming Conventions
- TypeScript with 4-space indentation and semicolons; follow existing file style.
- Prefer descriptive names; tests use `tNNN_*` filenames and exported `tNNN_*` identifiers.
- No formatter or linter is enforced; keep changes minimal and consistent.

## Testing Guidelines
- Framework: custom test harness in `src/tests.ts` with cases in `tests/`.
- Coverage is kept high (target ~99%); add tests for new branches/paths.
- Register new tests in `tests/index.ts` and ensure they pass under `npm test`.

## Commit & Pull Request Guidelines
- Commit messages: short, imperative summaries (e.g., “Add tool host docs”).
- PRs should include: summary, test commands run, and doc updates for user-facing changes.
- For playground/runtime changes, rebuild `web/iris.js` and mirror to `docs/iris.js`.

## Tooling & Environment Notes
- CLI uses compiled output in `dist/`; always rebuild after editing `src/`.
- Web playground expects `window.runIris` and optional `window.irisTools` for tools.
