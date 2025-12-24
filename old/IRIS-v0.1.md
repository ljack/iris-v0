# IRIS v0.1 Specification

## Overview
IRIS v0.1 is a minimal, deterministic, AI-centric programming language. It relies on strict S-expression syntax, canonical printing, and explicit effect management.

## 1. Syntax & Parsing
- **Format**: Strictly parenthesized S-expressions.
- **Atoms**:
    - `Int`: 64-bit signed integers (e.g., `123`, `-45`).
    - `Bool`: `true`, `false`.
    - `Str`: Double-quoted strings with strict escaping (`\"`, `\\`, `\n`, `\t`, `\r`).
    - `Symbol`: Identifiers (e.g., `main`, `x`, `io.print`).

## 2. Types
- `I64`: Integer.
- `Bool`: Boolean.
- `Str`: String.
- `(Option T)`: Optional value.
- `(Result T E)`: Success or Error.
- `(Record (k1 T1) (k2 T2) ...)`: Structural record type.

## 3. Definitions
- `(defconst (name ID) (type T) (value EXPR))`
- `(deffn (name ID) (args (n1 T1) ...) (ret T) (eff !EFF) (body EXPR))`

## 4. Expressions
- **Literal**: `1`, `true`, `"str"`.
- **Variable**: `x`.
- **Let**: `(let (x val) body)` - Immutable binding.
- **If**: `(if cond then else)`.
- **Call**: `(fn arg1 ...)` - Static dispatch.
- **Record**: `(record (k1 v1) (k2 v2) ...)` - Order independent at construction, sorted at runtime.
- **Match**:
  ```lisp
  (match target
    (case (tag "Some" (v)) body)
    (case (tag "None") body)
    ;; OR for Result
    (case (tag "Ok" (v)) body)
    (case (tag "Err" (e)) body))
  ```
- **Intrinsics**:
    - Math: `+`, `-`, `*`, `<`, `<=`, `=`.
    - Constructors: `(Some v)`, `None`, `(Ok v)`, `(Err v)`.
    - IO: `(io.print s)`, `(io.read_file path)`.

## 5. Effects
- `!Pure`: No side effects.
- `!IO`: Can perform IO.
- **Rule**: `!Pure` functions cannot call `!IO` functions or intrinsics.
- **Error**: Must raise `TypeError: EffectMismatch: ...`.

## 6. Canonical Output & Errors
The execution result is always a **Canonical String**.
- **Strings**: formatted as `"string"`.
- **Records**: formatted as `(record (a 1) (b 2))` (keys sorted lexicographically).
- **Options/Results**: `(Some 1)`, `None`, `(Ok 1)`, `(Err "msg")`.

**Error Prefixes**:
- `ParseError: ...`
- `TypeError: ...`
- `RuntimeError: ...`

## 7. Verification
`npm test` is the single source of truth. It runs all strict conformance tests (t01-t20).
