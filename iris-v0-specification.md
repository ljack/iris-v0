# IRIS v0.3 Specification

## 1. Core Philosophy
*   **Deterministic**: No undefined behavior, canonical S-expression syntax.
*   **Explicit Effects**: `!Pure`, `!IO`, `!Any`. No hidden side effects.
*   **Total**: Recursion must be bounded (fuel-based).
*   **Typed**: Static checking for all expressions.

## 2. Lexical & Syntax
*   **S-expressions**: `(tag args...)`
*   **Atoms**:
    *   Integers (`I64`): `0`, `-42`
    *   Booleans (`Bool`): `true`, `false`
    *   Strings (`Str`): `"hello\nworld"` (Strict JSON-style escaping)
    *   Symbols: `foo`, `io.print`

## 3. Types
*   `I64`, `Bool`, `Str`
*   `(Option T)`: Constructors `(Some v)`, `None` (literal)
*   `(Result T E)`: Constructors `(Ok v)`, `(Err e)`
*   `(List T)`: Constructors `nil`, `(cons h t)`
*   `(Record (k1 T1) (k2 T2) ...)`: Exact width, sorted keys.

## 4. Effect System
### Lattice
Levels: `!Pure` < `!IO` < `!Any`
*   **!Pure**: Deterministic, no side effects.
*   **!IO**: Filesystem, console, randomness.
*   **!Any**: Unrestricted (FFI, debug).

### Inference Rules
*   **Expr Effect**: Join of all sub-expression effects.
*   **!Infer**: If a function declares `(eff !Infer)`, its public effect is the join of its body's effects.
*   **Safety**: `(eff !Infer)` resolves to the concrete effect after typechecking. Recursive `!Infer` defaults to `!Any` for safety.

## 5. Evaluation Semantics (Call-by-Value)
*   **Arithmetic**: `+`, `-`, `*`, `/` (Integer division, div-by-zero errors).
*   **Bindings**: `let` is strict single-assignment. Shadowing is allowed lexical scoping.
*   **Control Flow**:
    *   `if`: strict condition (Bool).
    *   `match`: Exhaustive patterns for `Option` and `Result`.
*   **Recursion**: `(recur (fuel N) ...)` allows bounded recursion.

## 6. Canonicalization Rules
*   **Printer**:
    *   Strings: JSON-escaped.
    *   Records: Keys sorted usage `(record (a 1) (b 2))`.
    *   Lists: `(list 1 2 3)` sugar for cons-chains in output.
*   **None**: `None` is a literal. `(None)` is a ParseError.

## 7. Standard Library (Intrinsics)
*   **IO**: `io.read_file`, `io.write_file`, `io.print`.
*   **Constructors**: `Some`, `Ok`, `Err`, `cons`.

## 8. Danger Zones (Implementation Requirements)
1.  **None Typing**: `None` must typecheck as `Option<T>` for any `T` needed by context (Bottom type behavior for inner).
2.  **Dead Branch Inference**: Effects are inferred from *all* branches (e.g., `if true then Pure else IO` results in `!IO`), even if statically unreachable.
3.  **Recursion Limits**: Stack depth must be handled (or tail-call optimized if possible, but v0 spec allows stack overflow for >1000 depth if not tail).
