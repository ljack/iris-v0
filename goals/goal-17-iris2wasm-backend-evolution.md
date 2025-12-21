# Goal-17: IRIS → WASM Backend Evolution (Structure First, Text Last)

## Scope map
- This goal owns **compiler backend evolution**: WAT builder helpers → structured WASM IR → binary emission.
- Host/runtime ABI details live in `goals/goal-iris_wasm_host_plan.md`.
- Tool/host boundary principles live in `goals/goal-iris-wasm-plan-addenum-1.md`.

This goal defines the intended evolution of IRIS’s WebAssembly backend, informed by successful WASM-based systems (including how Zed *uses* WASM) and by current maintainability issues in IRIS’s WAT generation.

---

## Motivation

IRIS currently generates WebAssembly Text (WAT) by assembling strings directly in the compiler backend (e.g. `codegen_wasm_expr.iris`). This approach:

- is brittle due to heavy use of parentheses inside string literals
- makes refactoring error-prone and difficult to review
- confuses editors and structural tooling
- limits validation, optimization, and future evolution
- blocks a clean path to emitting WASM binaries

This goal establishes a clear, incremental path forward without breaking existing behavior.

---

## Core principle

**Preserve structure as data; serialize only at the edge.**

WebAssembly Text (WAT) is a *rendering format*, not a compiler IR.  
Successful WASM systems generate structured representations first and only render to text (or binary) at the final step.

---

## Architectural target

IRIS AST
↓
IRIS Core IR
↓
WASM IR (structured, IRIS-defined)
↓
┌────────────────────────┬────────────────────────┐
│ WAT renderer (debug) │ WASM binary emitter │
│ human-readable output │ execution-friendly │
└────────────────────────┴────────────────────────┘

yaml
Copy code

WAT remains useful for debugging and tests, but is no longer the primary compilation target.

---

## Lessons applied from Zed and other WASM systems

- WASM is best used as a **sandboxed execution or distribution format**, not as a string-based codegen target.
- Heavy work should happen outside WASM; WASM modules act as a deterministic control plane.
- Boundaries between compiler, runtime, and host must be explicit and versioned.
- Structured IRs are essential for correctness, maintainability, and evolution.

Zed itself does not generate WAT; it consumes compiled WASM artifacts. The lesson for IRIS is *boundary discipline*, not toolchain duplication.

---

## Scope of this goal

This goal focuses on the **IRIS compiler’s WASM backend** only:
- how IRIS generates WASM
- how that generation evolves safely
- how to reduce risk and improve clarity

It does **not** introduce new IRIS language features.

---

## Sub-goals

### G17.1 Stabilize current WAT generation (short-term)

**Objective:** Make existing WAT generation safe to refactor.

Actions:
- Introduce minimal WAT construction helpers (in `wasm_syntax` or a new module):
  - `ws.s(head, args)` → single-line S-expression
  - `ws.b(head, lines)` → multi-line block S-expression
  - `ws.lines(list)` / `ws.join_with(sep, list)`
  - optional indentation helper if string utilities exist
- Refactor `codegen_wasm_expr.iris` incrementally:
  - one function per commit
  - start with the most nested (`gen_match_cases`)
- Eliminate large nested `str.concat` chains.
- Add golden tests for representative AST inputs.

Success criteria:
- Manual parenthesis balancing is no longer required when editing generator code.
- Refactors are localized and test-protected.
- WAT output remains semantically identical.

---

### G17.2 Introduce a minimal structured WASM IR (medium-term)

**Objective:** Replace string-based codegen with a structured intermediate representation.

Actions:
- Define a minimal WASM IR in IRIS (e.g. `wasm_ir.iris`):
  - instructions (e.g. `i64.const`, `local.get`, `call`)
  - control-flow constructs (`if`, `then`, `else`, blocks)
  - memory operations (`load`, `store`, `memory.copy`)
- Update the compiler to emit WASM IR nodes instead of strings.
- Implement a renderer:
  - `wasm_ir_to_wat` for debugging and tests.

Status:
- Minimal `wasm_ir.iris` + `wasm_ir_to_wat.iris` exist in `examples/real/compiler`, with `tests/t161_wasm_ir_render.ts`.
- `codegen_wasm_expr.iris` routes literal I64/Bool through the IR renderer (`tests/t162_wasm_ir_codegen_literal.ts`).
- Var/Let now render `local.get`/`local.set` via IR helpers (`tests/t163_wasm_ir_codegen_var_let.ts`).
- `gen_match_cases` now builds IR nodes and renders them (`tests/t164_wasm_ir_match_cases.ts`).
- Added `node_if` helper for structured if/then/else blocks (covered in `tests/t161_wasm_ir_render.ts`).

Success criteria:
- Generator code manipulates structured nodes, not text.
- WAT exists only as a rendering output.
- Structural invariants can be checked before rendering.

---

### G17.3 Enable WASM binary emission (long-term)

**Objective:** Allow IRIS to emit executable `.wasm` directly.

Actions:
- Implement `wasm_ir_to_binary` for the subset of WASM used by IRIS.
- Keep WAT rendering for debugging and inspection.
- Add validation of module structure and section layout.

Success criteria:
- IRIS can produce valid `.wasm` binaries.
- Text generation is no longer required for execution.

---

## Testing and validation

### Short-term (G17.1)
- Golden string tests for WAT snippets produced by the compiler.
- Optional sanity checks (e.g. parenthesis balance in WAT output).

### Medium-term (G17.2)
- Structural tests for WASM IR well-formedness.
- Golden tests compare rendered WAT from IR, not hand-built strings.

### Long-term (G17.3)
- Binary validation tests.
- Execution tests in a minimal WASM runtime.

---

## Non-goals

- Building a full optimization pipeline at this stage.
- Introducing formatting tools unrelated to the compiler backend.
- Large, untested rewrites.
- Copying Zed’s exact WASM toolchain or APIs.

---

## Completion criteria for Goal-17

Goal-17 is complete when:
- WAT generation no longer relies on deep string concatenation,
- generator code is structurally clear and safe to edit,
- tests reliably detect regressions,
- and the repository contains a clear, documented path toward structured WASM IR and binary emission.

---

## Unified plan alignment (with host + tool boundary goals)
1. **Stabilize WAT generation** (this doc): builders + per-function refactors + snippet tests.
2. **Module assembly cleanup** (this doc): use builders at the module level.
3. **Structured WASM IR** (this doc): emit IR nodes, render WAT only at the edge.
4. **Binary emission** (this doc): `wasm_ir_to_binary`.
5. **Host boundary + capability profiles** (see `goal-iris_wasm_host_plan.md` and `goal-iris-wasm-plan-addenum-1.md`): ABI, profiles, tooling contracts.
