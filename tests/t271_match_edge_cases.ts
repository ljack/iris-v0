import { TestCase } from '../src/test-types';

// Tests for match edge cases and non-exhaustive patterns

export const t271_match_non_exhaustive: TestCase = {
  name: 'Test 271: match non-exhaustive',
  expect: '42',
  source: `(program
 (module (name "t271") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "Some" (v)) v))))))`
};

export const t272_match_wildcard: TestCase = {
  name: 'Test 272: match wildcard',
  expect: 'TypeError: Unknown option match tag: _',
  source: `(program
 (module (name "t272") (version 0))
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

export const t273_match_list_cons_two_vars: TestCase = {
  name: 'Test 273: match list cons with two vars',
  expect: '2',
  source: `(program
 (module (name "t273") (version 0))
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

export const t274_match_tuple_tagged: TestCase = {
  name: 'Test 274: match tuple as tagged union',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got Tuple)',
  source: `(program
 (module (name "t274") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple 1)
        (case (tag "Any") 42))))))`
};

export const t275_match_tuple_tagged_vars: TestCase = {
  name: 'Test 275: match tuple tagged with multiple vars',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got Tuple)',
  source: `(program
 (module (name "t275") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (tuple 1 2)
        (case (tag "Pair" (a b)) (+ a b)))))))`
};

export const t276_match_tagged_with_tuple: TestCase = {
  name: 'Test 276: match tagged with tuple payload',
  expect: 'TypeError: Match case Pair expects 1 variable (payload binding)',
  source: `(program
 (module (name "t276") (version 0))
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

export const t277_match_result_err: TestCase = {
  name: 'Test 277: match Result Err',
  expect: 'TypeError: Match arms mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t277") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Err "error")
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) e))))))`
};

export const t278_match_option_none: TestCase = {
  name: 'Test 278: match Option None',
  expect: 'TypeError: Unknown function call: None', // "None" should be (tag "None") or (None) constructor? 
  // Code uses (None) as literal? No, code uses (match (None) ...).
  source: `(program
 (module (name "t278") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (None)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
};

export const t279_match_list_nil: TestCase = {
  name: 'Test 279: match list nil',
  expect: '0',
  source: `(program
 (module (name "t279") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (list)
        (case (tag "nil") 0)
        (case (tag "cons" (h t)) h))))))`
};

export const t280_match_no_case: TestCase = {
  name: 'Test 280: match no matching case error',
  expect: 'RuntimeError: Non - exhaustive match for {"kind":"Option","value":{"kind":"I64","value":"42n"}}', // Replaces custom error check in old T280
  source: `(program
 (module (name "t280") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "None") 0))))))`
};
