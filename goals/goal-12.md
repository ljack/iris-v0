# Goal 12: Self-Hosting Compiler (Phase 1: Lexer)

## Objective
Implement a Lexer for the IRIS language, written *in* the IRIS language.

## Prerequisite: Missing Intrinsics
To parse strings character-by-character, we need additional string operations:
- `str.get(s, index)` -> `Option<I64>` (returns char code) or `Option<Str>` (char string)
- `str.substring(s, start, end)` -> `Str`
- `str.from_code(code)` -> `Str` ? (Maybe needed)

## Steps
1. **Extend Standard Library**: Add `str.get`, `str.substring` (and typecheck/eval support).
2. **Design Lexer Data Structures**:
   - `Token` type (using `tuple` or `record` with tag).
   - `Position` tracking.
3. **Implement `lexer.iris`**:
   - `tokenize(input)` function.
   - Handle whitespace, identifiers, literals (int, string), keywords, parentheses.
4. **Verify**:
   - Write a test runner (e.g., `t127.ts`) that loads `lexer.iris` and runs it on sample input.

## Success Criteria
- `lexer.iris` can correctly tokenize a simple IRIS program (like `(let x 10)`).
- Output is a list of structured tokens.
