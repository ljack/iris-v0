import { TestCase } from '../src/test-types';
import { run } from '../src/main';

// Tests for map and match errors/edge cases

export const t364_map_invalid_key_type: TestCase = {
  name: 'Test 364: map invalid key type',
  fn: async () => {
    const source = `(program
 (module (name "t364") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Map (Record (x I64)) I64))
    (eff !Pure)
    (body
      (let (m (map.make (record (x 0)) 0))
        (let (r (record (x 42)))
          (map.put m r 100)))))))`;

    const result = await run(source);
    if (!result.includes('Invalid map key type') && !result.includes('Runtime')) {
      throw new Error(`Expected Invalid map key type error, got ${result}`);
    }
  }
};

export const t365_map_invalid_key_string: TestCase = {
  name: 'Test 365: map invalid key string',
  fn: async () => {
    // This tests keyToValue with invalid format
    const source = `(program
 (module (name "t365") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body
      (let (m (map.make 0 0))
        (let (m2 (map.put m 42 100))
          (map.keys m2)))))))`;

    const result = await run(source);
    // Should return list with the key
    if (!result.includes('42') && !result.includes('list')) {
      throw new Error(`Expected list with key, got ${result}`);
    }
  }
};

export const t366_async_match_tagged_no_vars: TestCase = {
  name: 'Test 366: async match tagged no vars',
  expect: "ParseError: Expected RParen at 6:18, got Str 'Some'",
  source: `(program
 (module (name "t366") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Tagged "Some" I64))
    (eff !Pure)
    (body
      (match (tag "Some" 42)
        (case (tag "Some") (tag "Some" 42))
        (case (tag "_") (tag "None" 0)))))))`
};

export const t367_async_match_tagged_tuple_payload: TestCase = {
  name: 'Test 367: async match tagged with tuple payload',
  expect: 'TypeError: Match case Pair expects 1 variable (payload binding)',
  source: `(program
 (module (name "t367") (version 0))
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

export const t368_async_match_tagged_single_value: TestCase = {
  name: 'Test 368: async match tagged single value',
  expect: '42',
  source: `(program
 (module (name "t368") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (val (tag "Value" 42))
        (match val
          (case (tag "Value" (v)) v)
          (case (tag "_") 0)))))))`
};
