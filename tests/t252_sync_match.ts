import { TestCase } from '../src/test-types';

// Advanced tests for sync evaluation - Match paths

export const t252_sync_match_tagged: TestCase = {
  name: 'Test 252: sync match tagged with tuple',
  expect: 'TypeError: Match case Pair expects 1 variable (payload binding)',
  source: `(program
 (module (name "t252") (version 0))
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

export const t253_sync_match_list: TestCase = {
  name: 'Test 253: sync match list cons',
  expect: '1',
  source: `(program
 (module (name "t253") (version 0))
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

export const t254_sync_match_result: TestCase = {
  name: 'Test 254: sync match Result',
  expect: '42',
  source: `(program
 (module (name "t254") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Ok 42)
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) 0))))))`
};

export const t255_sync_match_option: TestCase = {
  name: 'Test 255: sync match Option',
  expect: '42',
  source: `(program
 (module (name "t255") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
};
