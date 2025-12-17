# Goal 13: Self-Hosting Compiler (Phase 2: Parser)

## Objective
Build upon the Lexer (Goal 12) to implement a **Parser** for IRIS, written in IRIS itself. This will take the list of tokens produced by the Lexer and convert them into an Abstract Syntax Tree (AST).

## Impact
- **Dogfooding**: Tests complex recursive data structures (ASTs) and algebraic data types (ADTs) in IRIS.
- **Validation**: Proves that IRIS is expressive enough to parse itself.
- **Foundation**: Required for the final phase (Evaluator/Compiler).

## Plan

### 1. Define AST Types
We need to define the AST structure in IRIS. Since IRIS doesn't have `type` aliases or full algebraic data types yet (only `Record` and tagged unions via `match`), we will model the AST using `Record`s and `Tag`s.

Expected AST Nodes:
- `Expr`: Union of `Int`, `Bool`, `Str`, `List`, `Call`, `Let`, `If`, `Fn`, etc.

### 2. Implement Parser Functions
- `parse(tokens: List<Token>) -> Result<Expr, Str>`
- Recursive descent parser logic.
- Helper functions: `expect(token)`, `peek()`, `consume()`.

### 3. Verification
- Create `tests/t128.ts` to run the Parser.
- Input: `(tokenize "(let x 1)")` result.
- Output: AST object.

## Work Breakdown
- [ ] Define AST types in `examples/parser.iris`
- [ ] Implement `parse_expr` and helpers
- [ ] Verify with `tests/t128.ts`
