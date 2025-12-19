import { TestCase } from '../src/test-types';

// Tests for async evaluation paths (evalExpr, evalIntrinsic)
// Part 1: Basics (Match, Data Structures, Control Flow, Variables, Calls, Constants)

export const t291_async_match_tagged_tuple: TestCase = {
  name: 'Test 291: async match tagged with tuple',
  expect: 'TypeError: Match case Pair expects 1 variable (payload binding)',
  source: `(program
 (module (name "t291") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tag "Pair" (tuple 1 2)))
        (match val
          (case (tag "Pair" (a b)) (+ a b))
          (case (tag "_") 0)))))))`
};

export const t292_async_match_list_cons: TestCase = {
  name: 'Test 292: async match list cons',
  expect: '1',
  source: `(program
 (module (name "t292") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) h))))))`
};

export const t293_async_match_list_two_vars: TestCase = {
  name: 'Test 293: async match list with two vars',
  expect: '2',
  source: `(program
 (module (name "t293") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list 1 2 3)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) (list.length t)))))))`
};

export const t294_async_match_tuple_tagged: TestCase = {
  name: 'Test 294: async match tuple as tagged',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got Tuple)',
  source: `(program
 (module (name "t294") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Some" 42)
        (case (tag "Some" (x)) x)
        (case (tag "None") 0))))))`
};

export const t295_async_match_tuple_multiple_vars: TestCase = {
  name: 'Test 295: async match tuple with multiple vars',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got Tuple)',
  source: `(program
 (module (name "t295") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple "Pair" 1 2)
        (case (tag "Pair" (a b)) (+ a b))
        (case (tag "_") 0))))))`
};

export const t296_async_match_wildcard: TestCase = {
  name: 'Test 296: async match wildcard',
  expect: 'TypeError: Unknown option match tag: _',
  source: `(program
 (module (name "t296") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0)
        (case (tag "_") 100))))))`
};

export const t297_async_match_no_match: TestCase = {
  name: 'Test 297: async match no matching case',
  expect: 'RuntimeError: Non - exhaustive match for {"kind":"Option","value":{"kind":"I64","value":"42n"}}',
  source: `(program
 (module (name "t297") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0))))))`
};

export const t298_async_record: TestCase = {
  name: 'Test 298: async record creation',
  expect: '(record (x 42) (y 10))',
  source: `(program
 (module (name "t298") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (x I64) (y I64)))
    (eff !Pure)
    (body (record (x 42) (y 10))))))`
};

export const t299_async_tagged: TestCase = {
  name: 'Test 299: async tagged creation',
  expect: "ParseError: Expected RParen at 6:18, got Str 'Some'",
  source: `(program
 (module (name "t299") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tagged "Some" I64))
    (eff !Pure)
    (body (tag "Some" 42)))))`
};

export const t300_async_tuple: TestCase = {
  name: 'Test 300: async tuple creation',
  expect: '(tuple 1 2 3)',
  source: `(program
 (module (name "t300") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tuple I64 I64 I64))
    (eff !Pure)
    (body (tuple 1 2 3)))))`
};

export const t301_async_list: TestCase = {
  name: 'Test 301: async list creation',
  expect: '(list 1 2 3)',
  source: `(program
 (module (name "t301") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (list 1 2 3)))))`
};

export const t302_async_intrinsic: TestCase = {
  name: 'Test 302: async intrinsic call',
  expect: '3',
  source: `(program
 (module (name "t302") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2)))))`
};

export const t303_async_let: TestCase = {
  name: 'Test 303: async let binding',
  expect: '30',
  source: `(program
 (module (name "t303") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 10)
        (let (y 20)
          (+ x y)))))))`
};

export const t304_async_if: TestCase = {
  name: 'Test 304: async if',
  expect: '10',
  source: `(program
 (module (name "t304") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if true 10 20)))))`
};

export const t305_async_if_else: TestCase = {
  name: 'Test 305: async if else',
  expect: '20',
  source: `(program
 (module (name "t305") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if false 10 20)))))`
};

export const t306_async_var_dot_notation: TestCase = {
  name: 'Test 306: async var dot notation',
  expect: '42',
  source: `(program
 (module (name "t306") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x (record (y 42)))))
        (let (inner r.x)
          inner.y))))))`
};

export const t307_async_var_tuple_index: TestCase = {
  name: 'Test 307: async var tuple index',
  expect: '2',
  source: `(program
 (module (name "t307") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2 3))
        (let (val t.1)
          val))))))`
};

export const t308_async_var_error_unknown_field: TestCase = {
  name: 'Test 308: async var unknown field error',
  expect: 'TypeError: Unknown field nonexistent in record',
  source: `(program
 (module (name "t308") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x 42)))
        (let (val r.nonexistent)
          val))))))`
};

export const t309_async_var_error_tuple_index: TestCase = {
  name: 'Test 309: async var tuple index error',
  expect: 'TypeError: Tuple index out of bounds: 100',
  source: `(program
 (module (name "t309") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2))
        (let (val t.100)
          val))))))`
};

export const t310_async_var_error_invalid_access: TestCase = {
  name: 'Test 310: async var invalid access error',
  expect: 'TypeError: Cannot access field field of non-record x',
  source: `(program
 (module (name "t310") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 42)
        (let (val x.field)
          val))))))`
};

export const t311_async_call_unknown_function: TestCase = {
  name: 'Test 311: async call unknown function',
  expect: 'TypeError: Unknown function call: nonexistent',
  source: `(program
 (module (name "t311") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call nonexistent)))))`
};

export const t312_async_call_arity_mismatch: TestCase = {
  name: 'Test 312: async call arity mismatch',
  expect: 'TypeError: Arity mismatch for f',
  source: `(program
 (module (name "t312") (version 0))
 (defs
  (deffn (name f)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body x))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (call f 1 2)))))`
};

export const t313_async_constants: TestCase = {
  name: 'Test 313: async constants',
  expect: '314',
  source: `(program
 (module (name "t313") (version 0))
 (defs
  (defconst (name PI) (type I64) (value 314))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body PI))))`
};

export const t314_async_constants_in_expr: TestCase = {
  name: 'Test 314: async constants in expression',
  expect: '43',
  source: `(program
 (module (name "t314") (version 0))
 (defs
  (defconst (name X) (type I64) (value 42))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ X 1)))))`
};
