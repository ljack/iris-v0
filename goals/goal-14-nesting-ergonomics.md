# Iris source nesting ergonomics

## Problem
Iris programs are deeply nested due to the current S-expression style and lack of shorthand for common control-flow and record updates. A quick scan of the repo shows 33 `.iris` files with max paren depth up to 37. The top nesting hotspots are:
- `examples/real/compiler/parser_top.iris` (max depth 37)
- `examples/real/apps/http_client.iris` (31)
- `examples/real/apps/iris_curl.iris` (29)
- `examples/real/compiler/parser_type.iris` (27)
- `examples/real/compiler/codegen_wasm_expr.iris` (26)

In `examples/real/apps/iris_curl.iris`, the heaviest nesting comes from:
- repeated record rebuilds for config updates
- stacked `if`/`let`/`match` chains in `parse_args_rec`
- verbose logging and response handling in `run_request`

This makes files harder to read, increases edit cost, and raises the risk of missing parens during changes.

## Repository-wide patterns observed
- Parser and typechecker modules have dense `match` trees with multi-step binding chains.
- App-level CLIs (http_client, iris_curl) suffer from repetitive config updates and flag parsing ladders.
- Codegen files mix structural assembly with formatting, leading to deep nesting around string concatenation and recursion.

## Goals
- Reduce visual nesting without changing semantics.
- Provide safe, minimal syntax sugar that improves readability.
- Improve tooling feedback (folding/outline) so current code is easier to navigate.

## Plan (incremental)
1. **Syntax sugar, minimal first**
   - `let*` for sequential bindings without deep nesting.
   - record update helper (e.g., `record.update` / `record.merge`) to avoid full rebuilds.
   - `cond`-style sugar to flatten `if` ladders.
2. **Tooling support**
   - LSP folding ranges for `(let ...)`, `(match ...)`, `(if ...)`.
   - Outline entries for `module`, `type`, `deffn`.
   - Optional formatter pass to keep parens aligned.
3. **Example refactors + style guide**
   - Refactor `iris_curl.iris` and `http_client.iris` to new constructs.
   - Add a short style guide: prefer `let*`, avoid stacked `if`, group helpers.
4. **Validation**
   - Add parser/linter tests for new constructs.
   - Ensure diagnostics and ranges remain precise after refactors.

## Success criteria
- `iris_curl.iris` nesting depth reduced by at least 30%.
- Fewer than 2 nested control blocks per logical section.
- LSP folding/outline make navigation fast without opening every block.
