# IRIS Core IR Review (Compiler Engineering)

## Scope
Review the current IR in `src/types.ts` to judge whether it can be a stable, long-term core for running IRIS “everywhere” (CLI/services, browser, embedded/edge). This document uses facts from the current codebase.

## IR Definition (from code)
- **Form:** high-level AST, expression-based (not SSA/CFG/CPS).
- **Program:** `Program` → `ModuleDecl`, `imports`, `defs`.
- **Defs:** `DefFn`, `DefTool`, `DefConst`, `TypeDef`.
- **Expr:** `Literal`, `Var`, `Let`, `If`, `Match`, `Do`, `Call`, `Intrinsic`, `List`, `Tuple`, `Fold`, `Lambda`, `Record`, `Tagged`.
- **Types:** `I64`, `Bool`, `Str`, `Option`, `Result`, `List`, `Tuple`, `Record`, `Map`, `Fn`, `Named`, `Union`.
- **Effects:** `!Pure`, `!IO`, `!Net`, `!Any`, `!Infer`.

## Classification
- **IR kind:** AST-like expression IR.
- **Not SSA:** no blocks, no phi, no CFG.
- **Control flow:** structured (`If`, `Match`, `Do`) only.

## Invariants (current)
- Names are strings (no symbol IDs).
- Type annotations exist on defs/lambdas; expressions are typed by checker, not stored.
- Intrinsics are string op names (e.g., `io.print`, `list.get`).

## Semantic Completeness
- **Mostly complete** for interpreter semantics.
- **Implicit semantics:** evaluation order, integer overflow model, host error model.
- **Runtime coupling:** intrinsics and tools depend on host interfaces (IO/Net/Tools).

## Types & ADTs
- **Typed IR:** types explicit on defs/lambdas.
- **ADT encoding:** `Union` types + `Tagged` values.
- **Generics:** absent (monomorphic only).
- **Nullability:** explicit via `Option`.

## Effects, Memory, Runtime
- Effects explicit in function type; no effect nodes in IR.
- No explicit memory model in IR.
- WASM ABI assumes strings as `[len:i64][bytes...]` (see `docs/WASM-ABI.md`).

## Control Flow Model
- Structured only; no exceptions, no early-exit ops.
- No explicit loops (encoded via recursion).

## Call Model + Concurrency
- Functions are first-class (`Lambda` with captured env).
- Calls are name-based strings.
- Concurrency modeled via intrinsics (`sys.spawn`, `sys.send`, etc.).

## Backend Openness Scorecard
- **Interpreter:** Natural fit.
- **WASM:** Moderate lowering (existing wasm IR + ABI).
- **Native (LLVM):** Major redesign (needs SSA/CFG/memory model).
- **JVM/CLR:** Major redesign (object model + ABI).

## Risks to “Everywhere”
- IR is **source-leaning AST**, not a backend-neutral core.
- Intrinsics as strings leak runtime/host assumptions.
- No explicit memory model for non-interpreter backends.

## Recommended Hard Invariants (future)
1. Replace string-based calls with symbol IDs.
2. Intrinsics are a closed enum, not stringly-typed.
3. All effects resolved (no `!Infer`) in core IR.
4. Evaluation order made explicit in IR nodes.
5. No implicit type conversions.

## Suggested Backend-Neutral Core IR (minimal)
- Keep expression form but store resolved symbols + explicit eval order.
- Attach inferred types to expression nodes.
- Normalize `Do`/sequence and `Match` lowering consistently.

## Target Strategy Recommendation
**Interpreter-first + WASM for portability**, then add a lower SSA/CFG IR for native/JVM if/when needed.
