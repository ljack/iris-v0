Here’s a **canonical printer + normalization spec** you can paste to Gemini so outputs and comparisons are deterministic.

> ## IRIS v0 Canonical Printer & Normalization Rules
>
> Goal: make program values print in exactly one stable form so tests can string-compare.
>
> ### 1) Canonical whitespace
>
> * No leading/trailing whitespace.
> * Single spaces between tokens inside lists.
> * No newlines in printed values (single-line output).
>
> ### 2) Atom printing
>
> * **I64**: decimal, no `+` sign, `0` prints as `0`. Negative numbers like `-12`.
> * **Bool**: `true` / `false`.
> * **Str**:
>
>   * Print with double quotes.
>   * Escape `\` as `\\`
>   * Escape `"` as `\"`
>   * Escape newline as `\n`, tab as `\t`, carriage return as `\r`
>   * No other escapes required for v0.
>   * Example: `hello` → `"hello"`, `a"b` → `"a\"b"`, line break → `"\n"`
> * **Symbol**: only appears in programs, not as runtime values (except if you implement a Symbol value type; if so, print as raw symbol token).
>
> ### 3) Canonical compound value forms (runtime values)
>
> The interpreter must represent and print runtime values using these exact S-expressions:
>
> * **Option**
>
>   * None: `None` (exact capitalization)
>   * Some: `(Some <v>)`
> * **Result**
>
>   * Ok: `(Ok <v>)`
>   * Err: `(Err <v>)`
> * **Tuple**
>
>   * `(tuple v1 v2 ... vn)` (lowercase `tuple`)
> * **Record**
>
>   * `(record (field1 v1) (field2 v2) ...)` (lowercase `record`)
>   * **Field order must be sorted lexicographically by field name** when printing, regardless of construction order.
> * **List** (if you implement runtime list values)
>
>   * Empty: `nil`
>   * Cons: `(cons head tail)`
>
> ### 4) Normalization (for comparison)
>
> Do not compare raw JS objects.
>
> * Compare **printed canonical strings**.
> * Ensure record fields are sorted before printing.
> * Ensure strings are escaped exactly as specified.
>
> ### 5) Error reporting format (typecheck/runtime)
>
> Tests may expect “TypeError” or “RuntimeError”. Use these exact prefixes:
>
> * Type errors: `TypeError: <message>`
> * Effect errors: `TypeError: EffectMismatch: <message>`
> * Parse errors: `ParseError: <message>`
> * Runtime errors (non-type): `RuntimeError: <message>`
>
> For Test 10 specifically, it’s sufficient that the output begins with:
>
> * `TypeError:` and contains `EffectMismatch`
>
> ### 6) IO mock semantics (deterministic)
>
> Use a mock filesystem `Map<string,string>` passed into evaluator:
>
> * `(io.read_file path)`
>
>   * if `fs` has key `path`: return `(Ok "<content>")` as a **Str** value inside Ok.
>   * else: return `(Err "ENOENT")`
> * `(io.write_file path content)`
>
>   * set `fs[path] = content`, return `(Ok true)`
> * `(io.print s)`
>
>   * append to an output buffer array of strings (exact runtime string content, not quoted)
>   * return `(Ok true)` OR `true` (choose one; but be consistent).
>   * For v0 tests we don’t assert print output, so either is fine.
>
> ### 7) Main program result
>
> When running a test program:
>
> * Evaluate `(call main)` implicitly (or run `main` with zero args).
> * Print the resulting value using the canonical rules above.
> * If the program is rejected at parse/typecheck time, print the error string as described above.
>
> ### 8) Must-not-haves in v0 printer
>
> * No pretty newlines.
> * No extra parentheses.
> * No JSON output.
> * No alternative casing (`none`, `some`, etc. are wrong).
>
> ### 9) Examples
>
> * `3`
> * `None`
> * `(Some 5)`
> * `(Ok "hello")`
> * `(Err "ENOENT")`
> * `(record (a 1) (b (Some "x")) (z 9))`
>
> Implement `printValue(v): string` to produce exactly these.

If you want to make Gemini’s life even easier, add one more instruction:

> “Build the test harness so each test has `name`, `programSource`, optional `fs`, and `expectedOutput` (string). Run all, print a compact summary, and exit(1) on any failure.”
