# IRIS v0 - Specific Test Recommendations

## Quick Fix: Failing Tests (10 minutes)

### Test 17 & Test 53 - Error Message Update

**Current Issue:**
```
Expected: 'TypeError: Match target must be Option or Result (got I64)'
Actual:   'TypeError: Match target must be Option, Result, or List (got I64)'
```

**Fix Required:** Update expected strings in two test files:

```typescript
// tests/t17.ts
export const t17: TestCase = {
  name: 'Test 17: match non-option',
  expect: 'TypeError: Match target must be Option, Result, or List (got I64)',  // ADD ", or List"
  source: `...`
};

// tests/t53.ts
// Same fix: Add ", or List" to expected error message
```

---

## Phase 1: Quick Win Tests (3-4 hours)

### T114: io.print with I64
```typescript
export const t114: TestCase = {
  name: 'Test 114: io.print I64',
  expect: '0',
  source: `(program
 (module (name "t114") (version 0))
 (defs
  (deffn (name main) (args) (ret I64) (eff !IO)
    (body (io.print 42)))))`
};
```
**Coverage:** io.print implementation path (line 311-321 in eval.ts)

### T115: io.print with Str
```typescript
export const t115: TestCase = {
  name: 'Test 115: io.print Str',
  expect: '0',
  source: `(program
 (module (name "t115") (version 0))
 (defs
  (deffn (name main) (args) (ret I64) (eff !IO)
    (body (io.print "hello")))))`
};
```
**Coverage:** io.print string handling (line 313-314)

### T116: io.print with Bool
```typescript
export const t116: TestCase = {
  name: 'Test 116: io.print Bool',
  expect: '0',
  source: `(program
 (module (name "t116") (version 0))
 (defs
  (deffn (name main) (args) (ret I64) (eff !IO)
    (body (io.print true)))))`
};
```
**Coverage:** io.print bool handling (line 315-316)

### T117: io.read_dir success
```typescript
export const t117: TestCase = {
  name: 'Test 117: io.read_dir success',
  expect: '(Ok (list "file1.txt" "file2.txt"))',
  source: `(program
 (module (name "t117") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result (List Str) Str)) (eff !IO)
    (body (io.read_dir ".")))))`,
  fs: {
    "file1.txt": "content1",
    "file2.txt": "content2"
  }
};
```
**Coverage:** io.read_dir success path (lines 301-308 in eval.ts)

### T118: io.read_dir not found
```typescript
export const t118: TestCase = {
  name: 'Test 118: io.read_dir not found',
  expect: '(Err "Directory not found or error")',
  source: `(program
 (module (name "t118") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result (List Str) Str)) (eff !IO)
    (body (io.read_dir "nonexistent")))))`
};
```
**Coverage:** io.read_dir error path (lines 302)

### T119: str.concat basic
```typescript
export const t119: TestCase = {
  name: 'Test 119: str.concat',
  expect: '"helloworld"',
  source: `(program
 (module (name "t119") (version 0))
 (defs
  (deffn (name main) (args) (ret Str) (eff !Pure)
    (body (str.concat "hello" "world")))))`
};
```
**Coverage:** str.concat implementation (lines 388-391)

### T120: str.contains true
```typescript
export const t120: TestCase = {
  name: 'Test 120: str.contains true',
  expect: 'true',
  source: `(program
 (module (name "t120") (version 0))
 (defs
  (deffn (name main) (args) (ret Bool) (eff !Pure)
    (body (str.contains "hello world" "world")))))`
};
```
**Coverage:** str.contains implementation (lines 394-397)

### T121: str.contains false
```typescript
export const t121: TestCase = {
  name: 'Test 121: str.contains false',
  expect: 'false',
  source: `(program
 (module (name "t121") (version 0))
 (defs
  (deffn (name main) (args) (ret Bool) (eff !Pure)
    (body (str.contains "hello" "world")))))`
};
```
**Coverage:** str.contains false path (line 397)

---

## Phase 2: IO & HTTP Edge Cases (4-6 hours)

### T122: http.parse_request empty body
```typescript
export const t122: TestCase = {
  name: 'Test 122: HTTP parse with no body',
  expect: '(Ok (record (body "") (headers (list)) (method "GET") (path "/test")))',
  source: `(program
 (module (name "t122") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result (Record (method Str) (path Str) (headers (List (Record (key Str) (val Str)))) (body Str)) Str)) (eff !Pure)
    (body (http.parse_request "GET /test HTTP/1.1\\r\\n\\r\\n")))))`
};
```
**Coverage:** HTTP parsing with minimal headers (lines 354-370)

### T123: http.parse_request malformed
```typescript
export const t123: TestCase = {
  name: 'Test 123: HTTP parse malformed request',
  expect: 'Err',  // Should start with (Err
  source: `(program
 (module (name "t123") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result (Record (method Str) (path Str) (headers (List (Record (key Str) (val Str)))) (body Str)) Str)) (eff !Pure)
    (body (http.parse_request "INVALID\\r\\n\\r\\n")))))`
};
```
**Coverage:** HTTP parsing error handling (lines 341-346, 383-385)

### T124: io.write_file with empty content
```typescript
export const t124: TestCase = {
  name: 'Test 124: io.write_file empty',
  expect: '(Ok 0)',
  source: `(program
 (module (name "t124") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result I64 Str)) (eff !IO)
    (body (io.write_file "/test.txt" "")))))`
};
```
**Coverage:** io.write_file return value calculation (line 287)

### T125: io.write_file large content
```typescript
export const t125: TestCase = {
  name: 'Test 125: io.write_file large',
  expect: '(Ok 1000)',
  source: `(program
 (module (name "t125") (version 0))
 (defs
  (deffn (name main) (args) (ret (Result I64 Str)) (eff !IO)
    (body (io.write_file "/test.txt" "${"x".repeat(1000)}")))))`
};
```
**Coverage:** io.write_file byte counting with large strings

---

## Phase 3: Parser & Type System (4-5 hours)

### T126: Parser error - unterminated string
```typescript
export const t126: TestCase = {
  name: 'Test 126: Unterminated string',
  expect: 'ParseError: Unterminated string',
  source: `(program
 (module (name "t126") (version 0))
 (defs
  (deffn (name main) (args) (ret Str) (eff !Pure)
    (body "unclosed))))`
};
```
**Coverage:** Unterminated string error (line 92 in sexp.ts)

### T127: Parser error - invalid character
```typescript
export const t127: TestCase = {
  name: 'Test 127: Invalid character',
  expect: 'ParseError: Unexpected character',
  source: `(program
 (module (name "t127") (version 0))
 (defs
  (deffn (name main) (args) (ret I64) (eff !Pure)
    (body @ 42))))`
};
```
**Coverage:** Unexpected character error (line 143 in sexp.ts)

### T128: Type checker - record field access
```typescript
export const t128: TestCase = {
  name: 'Test 128: Record field access',
  expect: '(record (a 1) (b 2))',
  source: `(program
 (module (name "t128") (version 0))
 (defs
  (defconst (name rec) (type (Record (a I64) (b I64))) (value (record (a 1) (b 2))))
  (deffn (name main) (args) (ret (Record (a I64) (b I64)) (eff !Pure)
    (body rec)))))`
};
```
**Coverage:** Record field type checking (typecheck.ts lines 89-105)

### T129: Tuple value type
```typescript
export const t129: TestCase = {
  name: 'Test 129: Tuple value',
  expect: '(tuple 1 2 3)',
  source: `(program
 (module (name "t129") (version 0))
 (defs
  (deffn (name main) (args) (ret (Tuple I64 I64 I64)) (eff !Pure)
    (body ???)))))`  // NOTE: Tuple construction not implemented in parser!
};
```
**Issue:** Tuple parsing not implemented - skip or implement as needed

### T130: Match no matching case
```typescript
export const t130: TestCase = {
  name: 'Test 130: Match no case matches',
  expect: 'RuntimeError: No matching case',
  source: `(program
 (module (name "t130") (version 0))
 (defs
  (deffn (name main) (args) (ret Str) (eff !Pure)
    (body
      (match 42
        (case (tag "a") "never"))))))`
};
```
**Coverage:** No matching case error path (line 222 in eval.ts)

### T131: Comparison operators
```typescript
export const t131: TestCase = {
  name: 'Test 131: >= comparison',
  expect: 'true',
  source: `(program
 (module (name "t131") (version 0))
 (defs
  (deffn (name main) (args) (ret Bool) (eff !Pure)
    (body (>= 5 3)))))`  // NOTE: >= not in parser implementation!
};
```
**Issue:** >= and > not in parser intrinsics list - implement if needed

### T132: Duplicate function arguments
```typescript
export const t132: TestCase = {
  name: 'Test 132: Duplicate arg names',
  expect: 'TypeError: Duplicate argument name',
  source: `(program
 (module (name "t132") (version 0))
 (defs
  (deffn (name main) (args (x I64) (x I64)) (ret I64) (eff !Pure)
    (body x))))`
};
```
**Coverage:** Duplicate argument detection (typecheck.ts line 19)

---

## Phase 4: Advanced Coverage (8-10 hours - Optional)

### T133-T140: Property-based math tests
Test properties like commutativity (+), associativity (*), identity elements, etc.
Implement using QuickCheck-style approach or manual generative approach.

### T141-T145: Deeply nested expressions
Test parser and evaluator with:
- 50-level deep let bindings
- 50-level nested if expressions
- 50-level match nesting

### T146-T150: Large program tests
Test with:
- 100+ function definitions
- 100+ constants
- Large record structures with many fields

---

## Summary

| Phase | Tests | Time | Coverage Gain | Final Coverage |
|-------|-------|------|---------------|-----------------|
| Fix T17/T53 | 1 (2 tests) | 10 min | +0.1% | 83.1% |
| Phase 1 | 8 new | 3-4 hrs | +3% | 86% |
| Phase 2 | 4 new | 4-6 hrs | +2.5% | 88.5% |
| Phase 3 | 6 new | 4-5 hrs | +3% | 91.5% |
| Phase 4 | 18 new | 8-10 hrs | +3.5% | 95% |

**Recommended:** Complete Phases 1-3 for 91% coverage in ~12 hours
**Stretch Goal:** Include Phase 4 for 95% coverage in ~22 hours

