# Contributing to Iris

## The Golden Rules 🌟

To maintain project stability, please check these rules before every commit:

1.  **Run Tests**: Always run `npm test` to ensure no regressions.
    ```bash
    npm test
    ```

2.  **Rebuild Before CLI Use**: The CLI (`bin/iris`) runs compiled code from `dist/`. If you modify `src/`, you **MUST** run the build command for the CLI to see your changes.
    ```bash
    npm run build
    ```
    *Failure to do this is a common cause of "Unknown intrinsic" errors.*

## How to Add Features

### 1. Adding an Intrinsic
If you want to add a new built-in function (e.g., `math.sqrt`):
1.  **Update Types**: Add the op string to `IntrinsicOp` in `src/types.ts`.
2.  **Update Parser**: Ensure `src/sexp.ts` recognizes the op as an Intrinsic (add to the list in `parseExpr`).
3.  **Implement**: Add the logic to `evalIntrinsic` in `src/eval.ts`.
4.  **Test**: Add a new test file `tests/tXXX.ts` and register it in `tests/index.ts`.

### 2. Adding a Test
1.  Create `tests/tXXX.ts` (copy an existing simple test).
2.  Define the source code and expected output.
3.  Import it in `tests/index.ts` and add it to the `TESTS` array.
