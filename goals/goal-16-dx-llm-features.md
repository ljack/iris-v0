# DX + LLM-oriented features (high level)

## Motivation
Iris targets LLM-friendly programming. That means:
- fewer syntax traps
- strong tooling feedback
- rich documentation surface
- predictable refactors

## Desired developer experience (DX)
- Fast, precise diagnostics with good ranges and related info.
- Full language server coverage: hover docs, goto def, references, rename, code actions.
- Project-wide analysis without opening files.
- Stable formatting and structural edits to reduce paren mistakes.

## LLM‑X feature ideas
1. **Structured docs in source**
   - `doc` blocks with examples, parameter descriptions, and return types.
   - LSP renders docs + examples on hover and completion.
2. **Explicit intent annotations**
   - e.g. `(intent "parse flags")` used by LLMs to preserve structure.
   - Optional, non-semantic; compiled out.
3. **Named blocks / labels**
   - e.g. `(label "request" (let ...))` to improve navigation and diffs.
4. **Safer editing primitives**
   - Built-in `format` or `normalize` command to balance parens.
   - Optional structure‑aware diff hints in `iris check`.
5. **Refactor helpers**
   - `extract` into `deffn`, `inline`, rename symbol.
   - LSP code actions with previews.
6. **Example-driven templates**
   - `iris new app http_client` scaffolding with docs/tests.
7. **Diagnostics for common LLM errors**
   - Unbalanced parens, wrong arity, wrong tag shape, missing `case` vars.
   - Suggest fixes in the diagnostic message.

## Phasing
- Phase 1: LSP coverage + doc rendering + formatting.
- Phase 2: annotations + refactor helpers.
- Phase 3: scaffolding + advanced diagnostics.

## Success criteria
- New users can navigate, run, and fix errors without learning all syntax.
- LLM edits trigger actionable, localized diagnostics.
- Tooling enables fast, safe refactors.
