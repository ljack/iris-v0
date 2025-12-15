An AI-only language: IRIS v0 (Intention-Revealing, Intrinsically Safe)

The goal is not “nice to read.” The goal is:

Deterministic parsing (no whitespace significance, no ambiguity)

No hidden state (immutability by default; mutation is explicit)

Explicit effects (I/O cannot happen silently)

Refactor-stable structure (all nodes are labeled; order rarely matters)

Machine-checkable contracts (types + pre/post + purity)

Easy diffing and patching (small local edits don’t cascade)

Core ideas

Everything is an S-expression with tags (canonical, easy to parse).

All bindings are single-assignment (SSA-like). No “variable re-use”.

Effects are explicit in the type: !Pure vs !IO vs !Net etc.

Total-by-default: recursion/loops must specify a bound or fuel.

No exceptions: errors are values ((Result T E)).

No null: use (Option T).

IRIS v0 specification (initial)
1) Lexical

Tokens: ( ) symbols, integers, booleans true|false, strings "...".

Symbols are case-sensitive and may include _ - : ..

No comments in v0 (to reduce parsing variance). If needed: (meta (comment "...")).

2) Types

Primitive:

I64, Bool, Str

Constructors:

(Option T)

(Result T E)

(List T)

(Tuple T1 T2 ... Tn)

(Record (field1 T1) (field2 T2) ...)

(Fn (args (a T1) (b T2) ...) (ret Tret) (eff !Pure|!IO|!Net|!Any))

3) Values

Integers: 0, -12

Bool: true, false

String: "abc"

Tuple: (tuple v1 v2)

Record: (record (field1 v1) (field2 v2))

4) Program shape

A program is:

(program
  (module (name "X") (version 0))
  (defs ...))


A definition is either a function or a constant:

(defconst (name ID) (type T) (value EXPR))
(deffn (name ID)
  (args (a T1) (b T2) ...)
  (ret Tret)
  (eff !Pure)
  (requires PRED)          ; optional
  (ensures PRED)           ; optional
  (body EXPR))

5) Expressions (v0)

Bindings:

(let (x EXPR) BODY) ; x is single-assignment

Control:

(if COND THEN ELSE)

(match EXPR (case (tag "Some" (v)) BODY) (case (tag "None") BODY))

For v0, Option is encoded as (Some v) and None.

Option constructors:

(Some EXPR)

None

Result constructors:

(Ok EXPR)

(Err EXPR)

Arithmetic (I64):

(+ a b) (- a b) (* a b) (<= a b) (< a b) (= a b)

Functions:

(call f arg1 arg2 ...)

Lists:

nil, (cons head tail)

(fold (list L) (init Z) (fn (args (acc T) (x T)) (ret T) (eff !Pure) (body EXPR)))
(Yes, anonymous fn is allowed but must be fully typed.)

Effects (explicit):

(io.print STR) ; requires eff !IO

(io.read_file PATHSTR) returns (Result Str Str) ; error is Str

(io.write_file PATHSTR CONTENTSTR) returns (Result Bool Str)

Rule: if your function body contains any (io.* ...), the function’s (eff ...) must be !IO (or !Any).

6) Totality rule (v0)

No unbounded loops. Recursion is allowed only via (recur fuel ...) form in v0:

(recur (fuel N) (fnname f) (args ...))


Meaning: recursive calls must decrease fuel by 1. When fuel hits 0, return (Err "OutOfFuel") (or a caller-chosen error type in later versions). This is clunky for humans and great for machines.

Reference “initial implementation” (for Gemini to try)

Tell Gemini to implement either:

a parser + type checker + interpreter for the subset above, or

just a validator + evaluator for the provided tests (enough to run the suite).

You can hand Gemini this minimal operational semantics:

Evaluate is strict (call-by-value).

let evaluates binding then body.

if requires Bool.

match on None or (Some v).

io.* are abstract ops; in tests we provide a mocked filesystem map.

Test suite (IRIS v0)
How to interpret tests

Each test has:

input: program

expect: either a final value or an error message

Some tests require IO; they include an initial fs map.

Below are 10 starter tests (enough to shake out parsing/types/effects/totality). You can expand later.

Test 01: pure add

expect: 3

(program
 (module (name "t01") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2)))))

Test 02: let + arithmetic

expect: 42

(program
 (module (name "t02") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x (* 6 7))
        x)))))

Test 03: if

expect: 9

(program
 (module (name "t03") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if (<= 3 3) 9 10)))))

Test 04: Option match

expect: 5

(program
 (module (name "t04") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 5)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))

Test 05: None branch

expect: 0

(program
 (module (name "t05") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match None
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))

Test 06: simple function call

expect: 11

(program
 (module (name "t06") (version 0))
 (defs
  (deffn (name add10)
    (args (a I64))
    (ret I64)
    (eff !Pure)
    (body (+ a 10)))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call add10 1)))))

Test 07: total recursion with fuel (factorial-ish)

expect: (Ok 120)

(program
 (module (name "t07") (version 0))
 (defs
  (deffn (name fact)
    (args (n I64) (fuel I64))
    (ret (Result I64 Str))
    (eff !Pure)
    (body
      (if (= fuel 0)
          (Err "OutOfFuel")
          (if (<= n 1)
              (Ok 1)
              (match (call fact (- n 1) (- fuel 1))
                (case (tag "Some" (v)) (Err "IMPOSSIBLE")) ; ignore in v0 if not supporting match on Result
                (case (tag "None") (Err "IMPOSSIBLE")))))))
  (deffn (name main)
    (args)
    (ret (Result I64 Str))
    (eff !Pure)
    (body (call fact 5 50)))))


Note: This test intentionally reveals a v0 gap: we didn’t define match for Result. For the initial suite, Gemini can either:

extend match to support (Ok v) and (Err e), or

you drop this test.
If you want the suite clean, use the next version of Test 07 instead (recommended):

Test 07 (recommended, uses only Option): Fibonacci with fuel returning Option I64
expect: (Some 13)

(program
 (module (name "t07") (version 0))
 (defs
  (deffn (name fib)
    (args (n I64) (fuel I64))
    (ret (Option I64))
    (eff !Pure)
    (body
      (if (= fuel 0)
          None
          (if (<= n 1)
              (Some n)
              (match (call fib (- n 1) (- fuel 1))
                (case (tag "None") None)
                (case (tag "Some" (a))
                  (match (call fib (- n 2) (- fuel 1))
                    (case (tag "None") None)
                    (case (tag "Some" (b)) (Some (+ a b)))))))))))
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body (call fib 7 100)))))

Test 08: IO read_file success (mocked fs)

fs: {"/a.txt": "hello"}
expect: (Ok "hello")

(program
 (module (name "t08") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/a.txt")))))

Test 09: IO read_file missing

fs: {}
expect: (Err "ENOENT")

(program
 (module (name "t09") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !IO)
    (body (io.read_file "/missing.txt")))))

Test 10: effect mismatch should fail typecheck

expect: TypeError (Pure function calling IO)

(program
 (module (name "t10") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Result Str Str))
    (eff !Pure)
    (body (io.read_file "/a.txt")))))

Instructions to paste to Gemini

Copy/paste this block to Gemini as-is:

You are implementing IRIS v0, an AI-only programming language.
Task: parse, typecheck, and interpret the given IRIS programs.
Requirements:

Deterministic parsing of S-expressions.

Typecheck all expressions. Reject effect mismatches (IO ops inside !Pure).

Interpret main with zero args.

For IO tests, use a mocked filesystem map provided by the test harness.

Output the final value in the same S-expression-ish form (3, None, (Some 5), (Ok "x"), (Err "x")).
Run tests t01–t10 and report pass/fail. If a test reveals a spec gap, propose the smallest spec change and rerun.

What I need from your feedback (so we iterate usefully)

After you try Gemini on this:

Which parts did Gemini “invent” instead of following? (parser? types? printing?)

Did it get stuck on Option/Result representation?

Did effect checking work or did it hand-wave?

Then we’ll tighten v0: either (a) extend match to cover Result, or (b) make Result a first-class tagged union with canonical patterns, and add 20–50 tests that punish ambiguity.
