# Test Recommendations for IRIS v0 Coverage Improvements

**Date**: 2025-12-16
**Current Coverage**: 82%
**Target Coverage**: 92%
**Effort**: 12-16 hours of test development

---

## Quick Navigation

1. [Critical Tests (Must Add)](#critical-tests-must-add)
2. [High-Priority Tests](#high-priority-tests)
3. [Medium-Priority Tests](#medium-priority-tests)
4. [Optional Tests](#optional-tests)
5. [Test Templates](#test-templates)

---

## Critical Tests (Must Add)

### CRITICAL-1: Division by Zero

**File**: `tests/tC01.ts`
**Impact**: Prevents runtime crash
**Effort**: 30 minutes
**Coverage Gain**: 0.5%

```typescript
import { TestCase } from '../src/test-types';

export const tC01: TestCase = {
    name: 'CRITICAL-1: Division by Zero',
    expect: 'RuntimeError: Division by zero',
    source: `(program
  (module (name "tC01") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body (/ 10 0)))))`,
};
```

**Code Path**: src/eval.ts:256-258
**Why**: Currently throws error but could be more graceful
**Acceptance**: Error message contains "Division by zero"

---

### CRITICAL-2: Parser - Unterminated String

**File**: `tests/tC02.ts`
**Impact**: Prevents infinite loop in lexer
**Effort**: 30 minutes
**Coverage Gain**: 0.5%

```typescript
import { TestCase } from '../src/test-types';

export const tC02: TestCase = {
    name: 'CRITICAL-2: Unterminated String',
    expect: 'ParseError: Unterminated string starting at 1:12',
    source: `(program (module (name "tC02") (version 0)) (defs
      (deffn (name main) (args) (ret Str) (eff !Pure)
        (body "hello))))`,
};
```

**Code Path**: src/sexp.ts:92-93
**Why**: Users can write invalid input that crashes parser
**Acceptance**: Error contains "Unterminated string"

---

### CRITICAL-3: Parser - Unexpected Character

**File**: `tests/tC03.ts`
**Impact**: Better error messages
**Effort**: 30 minutes
**Coverage Gain**: 0.5%

```typescript
import { TestCase } from '../src/test-types';

export const tC03: TestCase = {
    name: 'CRITICAL-3: Unexpected Character',
    expect: 'ParseError: Unexpected character \'@\' at 1:24',
    source: `(program (module (name "tC03") (version 0)) (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body @invalid))))`,
};
```

**Code Path**: src/sexp.ts:143
**Why**: Users need clear error messages for syntax errors
**Acceptance**: Error contains "Unexpected character"

---

### CRITICAL-4: TypeChecker - Duplicate Arguments

**File**: `tests/tC04.ts`
**Impact**: Catches function definition errors
**Effort**: 30 minutes
**Coverage Gain**: 0.5%

```typescript
import { TestCase } from '../src/test-types';

export const tC04: TestCase = {
    name: 'CRITICAL-4: Duplicate Function Arguments',
    expect: 'TypeError: Duplicate argument name: x',
    source: `(program
  (module (name "tC04") (version 0))
  (defs
    (deffn (name bad_func) (args (x I64) (x I64)) (ret I64) (eff !Pure)
      (body (+ x x)))))`,
};
```

**Code Path**: src/typecheck.ts:18-20
**Why**: Prevents silent shadowing bugs
**Acceptance**: Error message mentions "Duplicate argument"

---

## High-Priority Tests

### HP-1: io.print Operation

**File**: `tests/thp01.ts`
**Impact**: Validates I/O side effects
**Effort**: 30 minutes
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp01: TestCase = {
    name: 'HP-1: IO print operation',
    expect: '0',  // Returns 0 on success
    source: `(program
  (module (name "thp01") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !IO)
      (body (io.print "Hello, IRIS!")))))`,
};
```

**Code Path**: src/eval.ts:279-283
**Why**: Validates I/O works as expected
**Acceptance**: Prints message and returns 0

---

### HP-2: String Operations - Empty String

**File**: `tests/thp02.ts`
**Impact**: Edge case handling
**Effort**: 30 minutes
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp02: TestCase = {
    name: 'HP-2: String concat with empty string',
    expect: '"hello"',
    source: `(program
  (module (name "thp02") (version 0))
  (defs
    (deffn (name main) (args) (ret Str) (eff !Pure)
      (body (str.concat "hello" "")))))`,
};
```

**Code Path**: src/eval.ts:350-354
**Why**: Handles edge case
**Acceptance**: Returns "hello"

---

### HP-3: String Operations - Contains Empty

**File**: `tests/thp03.ts`
**Impact**: Edge case handling
**Effort**: 30 minutes
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp03: TestCase = {
    name: 'HP-3: String contains empty substring',
    expect: 'true',
    source: `(program
  (module (name "thp03") (version 0))
  (defs
    (deffn (name main) (args) (ret Bool) (eff !Pure)
      (body (str.contains "hello" "")))))`,
};
```

**Code Path**: src/eval.ts:356-360
**Why**: Edge case - empty string is contained in all strings
**Acceptance**: Returns true

---

### HP-4: Module Error - Not Found

**File**: `tests/thp04.ts`
**Impact**: Better error handling
**Effort**: 1 hour
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp04: TestCase = {
    name: 'HP-4: Module not found error',
    expect: 'RuntimeError: Failed to resolve module "nonexistent"',
    modules: {},
    source: `(program
  (module (name "thp04") (version 0))
  (imports (import "nonexistent" (as "X")))
  (defs
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body (X.foo)))))`,
};
```

**Code Path**: src/main.ts:116-125
**Why**: Users need clear messages when modules are missing
**Acceptance**: Error indicates module not found

---

### HP-5: Parser - Missing Closing Paren

**File**: `tests/thp05.ts`
**Impact**: Better error recovery
**Effort**: 1 hour
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp05: TestCase = {
    name: 'HP-5: Parser - Missing closing paren',
    expect: 'ParseError: Expected RParen but got EOF',
    source: `(program (module (name "thp05") (version 0)) (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body (+ 1 2)`,
};
```

**Code Path**: src/sexp.ts:~260
**Why**: Detect incomplete expressions
**Acceptance**: Error mentions missing paren

---

### HP-6: List Operations - Empty List

**File**: `tests/thp06.ts`
**Impact**: Edge case handling
**Effort**: 30 minutes
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp06: TestCase = {
    name: 'HP-6: Empty list construction',
    expect: '(list)',
    source: `(program
  (module (name "thp06") (version 0))
  (defs
    (deffn (name main) (args) (ret (List I64)) (eff !Pure)
      (body (list)))))`,
};
```

**Code Path**: src/sexp.ts:~365-370
**Why**: Lists can be empty
**Acceptance**: Returns empty list representation

---

### HP-7: Record Field Access - Missing Field

**File**: `tests/thp07.ts`
**Impact**: Better error messages
**Effort**: 1 hour
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp07: TestCase = {
    name: 'HP-7: Record field access - missing field',
    expect: 'TypeError: Unknown field missing in record',
    source: `(program
  (module (name "thp07") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body
        (let (r (record (a 1) (b 2)))
          r.missing)))))`,
};
```

**Code Path**: src/typecheck.ts:97
**Why**: Catch field access errors at type check time
**Acceptance**: Error mentions "Unknown field"

---

### HP-8: HTTP Edge Case - Malformed Request

**File**: `tests/thp08.ts`
**Impact**: Robustness of HTTP parser
**Effort**: 1 hour
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const thp08: TestCase = {
    name: 'HP-8: HTTP malformed request',
    expect: '(Err "Invalid request line")',
    source: `(program
  (module (name "thp08") (version 0))
  (defs
    (deffn (name main) (args) (ret (Result (Record) Str)) (eff !Pure)
      (body (http.parse_request "INVALID\\r\\n\\r\\n")))))`,
};
```

**Code Path**: src/eval.ts:302-312
**Why**: Validate malformed HTTP handling
**Acceptance**: Returns Err variant with message

---

## Medium-Priority Tests

### MP-1: Tuple Types - Basic

**File**: `tests/tmp01.ts`
**Impact**: Complete type system coverage
**Effort**: 1.5 hours
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const tmp01: TestCase = {
    name: 'MP-1: Tuple type - basic construction',
    expect: '(tuple 1 "hello" true)',
    source: `(program
  (module (name "tmp01") (version 0))
  (defs
    (deffn (name main) (args) (ret (Tuple I64 Str Bool)) (eff !Pure)
      (body (tuple 1 "hello" true)))))`,
};
```

**Code Path**: src/sexp.ts, src/eval.ts
**Why**: Tuples are defined but untested
**Acceptance**: Constructs and prints tuple correctly

---

### MP-2: Tuple Types - Type Checking

**File**: `tests/tmp02.ts`
**Impact**: Type safety for tuples
**Effort**: 1 hour
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const tmp02: TestCase = {
    name: 'MP-2: Tuple type mismatch',
    expect: 'TypeError: Tuple element 1 type mismatch',
    source: `(program
  (module (name "tmp02") (version 0))
  (defs
    (deffn (name main) (args) (ret (Tuple I64 Str)) (eff !Pure)
      (body (tuple 1 false)))))`,
};
```

**Code Path**: src/typecheck.ts
**Why**: Validate type checking for tuples
**Acceptance**: Catches type mismatch

---

### MP-3: IO.read_dir Operation

**File**: `tests/tmp03.ts`
**Impact**: Complete I/O coverage
**Effort**: 1.5 hours
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const tmp03: TestCase = {
    name: 'MP-3: IO read_dir operation',
    expect: '(Ok (list "file1.txt" "file2.txt"))',
    fs: {
        "file1.txt": "content1",
        "file2.txt": "content2"
    },
    source: `(program
  (module (name "tmp03") (version 0))
  (defs
    (deffn (name main) (args) (ret (Result (List Str) Str)) (eff !IO)
      (body (io.read_dir ".")))))`,
};
```

**Code Path**: src/eval.ts:~290
**Why**: Complete I/O operation coverage
**Acceptance**: Returns list of files

---

### MP-4: Record Field Access - Nested

**File**: `tests/tmp04.ts`
**Impact**: Complex record handling
**Effort**: 1.5 hours
**Coverage Gain**: 0.3%

```typescript
import { TestCase } from '../src/test-types';

export const tmp04: TestCase = {
    name: 'MP-4: Nested record field access',
    expect: '42',
    source: `(program
  (module (name "tmp04") (version 0))
  (defs
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body
        (let (outer (record (inner (record (value 42)))))
          outer.inner.value)))))`,
};
```

**Code Path**: src/typecheck.ts:89-100
**Why**: Validate nested field access works
**Acceptance**: Retrieves nested value

---

### MP-5: String Edge Case - Very Long String

**File**: `tests/tmp05.ts`
**Impact**: Performance validation
**Effort**: 30 minutes
**Coverage Gain**: 0.2%

```typescript
import { TestCase } from '../src/test-types';

export const tmp05: TestCase = {
    name: 'MP-5: String concat - long string',
    expect: '"' + 'a'.repeat(1000) + '"',
    source: `(program
  (module (name "tmp05") (version 0))
  (defs
    (deffn (name main) (args) (ret Str) (eff !Pure)
      (body (str.concat "${'a'.repeat(500)}" "${'a'.repeat(500)}")))))`,
};
```

**Code Path**: src/eval.ts:350-354
**Why**: Validate string operations scale
**Acceptance**: Handles long strings

---

### MP-6: List Operations - Large List

**File**: `tests/tmp06.ts`
**Impact**: Performance validation
**Effort**: 1 hour
**Coverage Gain**: 0.2%

```typescript
import { TestCase } from '../src/test-types';

export const tmp06: TestCase = {
    name: 'MP-6: List operations - large list',
    expect: '(list ' + Array(100).fill(1).map((_, i) => i).join(' ') + ')',
    source: `(program
  (module (name "tmp06") (version 0))
  (defs
    (deffn (name main) (args) (ret (List I64)) (eff !Pure)
      (body (list ${Array(100).fill(0).map((_, i) => i).join(' ')})))))`,
};
```

**Code Path**: src/sexp.ts, src/eval.ts
**Why**: Validate list handling at scale
**Acceptance**: Constructs and returns large list

---

## Optional Tests

### OPT-1: Parser Error - Invalid Type Syntax

**File**: `tests/topt01.ts`
**Impact**: Better error messages
**Effort**: 1 hour
**Coverage Gain**: 0.2%

```typescript
import { TestCase } from '../src/test-types';

export const topt01: TestCase = {
    name: 'OPT-1: Parser - invalid type syntax',
    expect: 'TypeError: Invalid type syntax',
    source: `(program
  (module (name "topt01") (version 0))
  (defs
    (deffn (name main) (args (x ???)) (ret I64) (eff !Pure)
      (body x))))`,
};
```

**Code Path**: src/sexp.ts:~400
**Why**: Catch type syntax errors
**Acceptance**: Clear error about type syntax

---

### OPT-2: Effect System - Pure Function Calling IO

**File**: `tests/topt02.ts`
**Impact**: Effect validation edge case
**Effort**: 1 hour
**Coverage Gain**: 0.2%

```typescript
import { TestCase } from '../src/test-types';

export const topt02: TestCase = {
    name: 'OPT-2: Pure function cannot call IO',
    expect: 'TypeError: EffectMismatch: Function main: Inferred !IO but declared !Pure',
    source: `(program
  (module (name "topt02") (version 0))
  (defs
    (deffn (name do_io) (args) (ret I64) (eff !IO)
      (body (io.write_file "test.txt" "data")))
    (deffn (name main) (args) (ret I64) (eff !Pure)
      (body (do_io)))))`,
};
```

**Code Path**: src/typecheck.ts:54-55
**Why**: Validate effect restrictions
**Acceptance**: Error caught at type check

---

### OPT-3: HTTP Parser - Request with Body

**File**: `tests/topt03.ts`
**Impact**: Complete HTTP handling
**Effort**: 1 hour
**Coverage Gain**: 0.2%

```typescript
import { TestCase } from '../src/test-types';

export const topt03: TestCase = {
    name: 'OPT-3: HTTP request with body',
    expect: '(Ok (record (body "request body") (headers (list)) (method "POST") (path "/api")))',
    source: `(program
  (module (name "topt03") (version 0))
  (defs
    (deffn (name main) (args) (ret (Result (Record) Str)) (eff !Pure)
      (body (http.parse_request "POST /api HTTP/1.1\\r\\n\\r\\nrequest body")))))`,
};
```

**Code Path**: src/eval.ts:297-348
**Why**: Validate POST requests work
**Acceptance**: Parses body correctly

---

## Test Templates

### Template 1: Simple Expression Test

```typescript
import { TestCase } from '../src/test-types';

export const tNEW: TestCase = {
    name: 'TEST_NAME: Description',
    expect: 'EXPECTED_OUTPUT',
    source: `(program
  (module (name "tNEW") (version 0))
  (defs
    (deffn (name main) (args) (ret RETURN_TYPE) (eff !Pure)
      (body EXPRESSION))))`,
};
```

### Template 2: Function Call Test

```typescript
import { TestCase } from '../src/test-types';

export const tNEW: TestCase = {
    name: 'TEST_NAME: Description',
    expect: 'EXPECTED_OUTPUT',
    source: `(program
  (module (name "tNEW") (version 0))
  (defs
    (deffn (name helper) (args ARGS) (ret RETURN_TYPE) (eff EFFECT)
      (body BODY))
    (deffn (name main) (args) (ret RETURN_TYPE) (eff EFFECT)
      (body (helper ARGS)))))`,
};
```

### Template 3: Module Import Test

```typescript
import { TestCase } from '../src/test-types';

export const tNEW: TestCase = {
    name: 'TEST_NAME: Description',
    expect: 'EXPECTED_OUTPUT',
    modules: {
        "libname": `(program (module (name "libname") (version 0)) (defs
            (deffn (name func_name) (args ARGS) (ret RETURN_TYPE) (eff EFFECT)
              (body BODY))))`
    },
    source: `(program
  (module (name "tNEW") (version 0))
  (imports (import "libname" (as "Lib")))
  (defs
    (deffn (name main) (args) (ret RETURN_TYPE) (eff EFFECT)
      (body (Lib.func_name ARGS)))))`,
};
```

### Template 4: Error Test

```typescript
import { TestCase } from '../src/test-types';

export const tNEW: TestCase = {
    name: 'TEST_NAME: Description',
    expect: 'ErrorType: Error message',
    source: `(program
  (module (name "tNEW") (version 0))
  (defs
    (deffn (name main) (args) (ret RETURN_TYPE) (eff EFFECT)
      (body INVALID_EXPRESSION))))`,
};
```

### Template 5: I/O Test

```typescript
import { TestCase } from '../src/test-types';

export const tNEW: TestCase = {
    name: 'TEST_NAME: Description',
    expect: 'EXPECTED_OUTPUT',
    fs: {
        "file1.txt": "content1",
        "file2.txt": "content2"
    },
    source: `(program
  (module (name "tNEW") (version 0))
  (defs
    (deffn (name main) (args) (ret RETURN_TYPE) (eff !IO)
      (body IO_OPERATION))))`,
};
```

---

## Test Implementation Checklist

### Critical Tests (4 tests, ~2 hours)
- [ ] tC01: Division by zero
- [ ] tC02: Unterminated string
- [ ] tC03: Unexpected character
- [ ] tC04: Duplicate arguments

### High-Priority Tests (8 tests, ~5 hours)
- [ ] thp01: io.print
- [ ] thp02: String concat empty
- [ ] thp03: String contains empty
- [ ] thp04: Module not found
- [ ] thp05: Missing closing paren
- [ ] thp06: Empty list
- [ ] thp07: Record field missing
- [ ] thp08: HTTP malformed

### Medium-Priority Tests (6 tests, ~7 hours)
- [ ] tmp01: Tuple construction
- [ ] tmp02: Tuple type mismatch
- [ ] tmp03: io.read_dir
- [ ] tmp04: Nested record access
- [ ] tmp05: Long string
- [ ] tmp06: Large list

### Optional Tests (3 tests, ~3 hours)
- [ ] topt01: Invalid type syntax
- [ ] topt02: Pure calling IO
- [ ] topt03: HTTP with body

---

## Coverage Progress Tracking

```
Current:  82% (1,225/1,495 lines)

After Critical (4 tests):     84% (+1,225 lines)
After High-Priority (8 tests): 88% (+1,235 lines)
After Medium (6 tests):        91% (+1,250 lines)
After Optional (3 tests):      92% (+1,255 lines)
```

---

## Success Criteria

✅ All tests pass
✅ Coverage reaches target percentage
✅ Error messages are clear
✅ Edge cases handled gracefully
✅ No regressions in existing tests

---

## Integration Steps

1. Create test files in `tests/tC*.ts`, `tests/thp*.ts`, etc.
2. Export tests in `tests/index.ts`
3. Run `npm test` to verify
4. Update coverage report
5. Commit with message documenting coverage improvements

---

## Conclusion

These 21 recommended tests will improve coverage from 82% to 92% in approximately 12-16 hours of focused development. Start with critical tests for immediate risk reduction, then progress to high-priority tests for comprehensive coverage.
