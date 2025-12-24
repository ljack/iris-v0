import { TestCase } from '../src/test-types';
import { run } from '../src/main';

// Tests for valueToKey and keyToValue conversions

export const t381_map_tagged_str_key: TestCase = {
  name: 'Test 381: map tagged Str key',
  expect: '(Some 100)',
  source: `(program
 (module (name "t381") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make (tag "Str" "") 0))
        (let (val (tag "Str" "hello"))
          (let (m2 (map.put m val 100))
            (map.get m2 val))))))))`
};

export const t382_map_tagged_i64_key: TestCase = {
  name: 'Test 382: map tagged I64 key',
  expect: '(Some 100)',
  source: `(program
 (module (name "t382") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make (tag "I64" 0) 0))
        (let (val (tag "I64" 42))
          (let (m2 (map.put m val 100))
            (map.get m2 val))))))))`
};

export const t383_map_tagged_other_key: TestCase = {
  name: 'Test 383: map tagged other key',
  expect: '(Some 100)',
  source: `(program
 (module (name "t383") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Option I64))
    (eff !Pure)
    (body
      (let (m (map.make (tag "Some" 0) 0))
        (let (val (tag "Some" 42))
          (let (m2 (map.put m val 100))
             (map.get m2 val))))))))`,
};

export const t384_map_keys_i64_str: TestCase = {
  name: 'Test 384: map.keys with I64 and Str',
  expect: '(list (tag "I64" 42) (tag "Str" "key"))',
  source: `(program
 (module (name "t384") (version 0))
 (defs
  (deffn (name make_poly_map)
    (args (w (Union (tag "I64" I64) (tag "Str" Str))))
    (ret (Map (Union (tag "I64" I64) (tag "Str" Str)) I64))
    (eff !Pure)
    (body (map.make w 0)))
  (deffn (name main)
    (args)
    (ret (List (Union (tag "I64" I64) (tag "Str" Str))))
    (eff !Pure)
    (body
      (let (m (make_poly_map (tag "I64" 0)))
        (let (m2 (map.put m (tag "I64" 42) 1))
          (let (m3 (map.put m2 (tag "Str" "key") 2))
            (map.keys m3))))))))`
};

export const t385_async_init_constants: TestCase = {
  name: 'Test 385: async init constants',
  expect: '314',
  source: `(program
 (module (name "t385") (version 0))
 (defs
  (defconst (name PI) (type I64) (value 314))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body PI))))`
};

export const t386_async_init_constants_multiple: TestCase = {
  name: 'Test 386: async init multiple constants',
  expect: '356',
  source: `(program
 (module (name "t386") (version 0))
 (defs
  (defconst (name X) (type I64) (value 42))
  (defconst (name Y) (type I64) (value 314))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ X Y)))))`
};

export const t387_async_constants_already_init: TestCase = {
  name: 'Test 387: async constants already initialized',
  expect: '42',
  source: `(program
 (module (name "t387") (version 0))
 (defs
  (defconst (name X) (type I64) (value 42))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body X))))`
};

export const t388_async_call_with_dot_notation: TestCase = {
  name: 'Test 388: async call with dot notation',
  expect: '30',
  source: `(program
 (module (name "t388") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (x (record (y 30)))))
        r.x.y)))))`
};

export const t389_async_call_with_tuple_index: TestCase = {
  name: 'Test 389: async call with tuple index',
  expect: '2',
  source: `(program
 (module (name "t389") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (t (tuple 1 2 3))
        t.1)))))`
};

export const t390_async_call_nested_dot: TestCase = {
  name: 'Test 390: async call nested dot notation',
  expect: '42',
  source: `(program
 (module (name "t390") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (a (record (b (record (c 42)))))))
        r.a.b.c)))))`
};

export const t391_async_call_mixed_dot: TestCase = {
  name: 'Test 391: async call mixed dot and tuple',
  expect: '3',
  source: `(program
 (module (name "t391") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (r (record (items (tuple 1 2 3))))
        (let (t r.items)
          t.2))))))`
};

export const t392_async_var_from_env: TestCase = {
  name: 'Test 392: async var from env',
  expect: '42',
  source: `(program
 (module (name "t392") (version 0))
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
    (body (f 42)))))`
};

export const t393_async_var_shadowing: TestCase = {
  name: 'Test 393: async var shadowing',
  expect: '20',
  source: `(program
 (module (name "t393") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x 10)
        (let (x 20)
          x))))))`
};

export const t394_async_match_result_ok: TestCase = {
  name: 'Test 394: async match Result Ok',
  expect: '42',
  source: `(program
 (module (name "t394") (version 0))
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

export const t395_async_match_result_err: TestCase = {
  name: 'Test 395: async match Result Err',
  expect: '0',
  source: `(program
 (module (name "t395") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Err "error")
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) 0))))))`
};

export const t396_async_match_option_some: TestCase = {
  name: 'Test 396: async match Option Some',
  expect: '42',
  source: `(program
 (module (name "t396") (version 0))
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

export const t397_async_match_option_none: TestCase = {
  name: 'Test 397: async match Option None',
  expect: '0',
  source: `(program
    (module (name "t397") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body
          (match (str.index_of "a" "b") ; Returns None
            (case (tag "Some" (v)) v)
            (case (tag "None") 0)
          )
        )
      )
    )
  )`
};

export const t398_async_match_list_nil: TestCase = {
  name: 'Test 398: async match list nil',
  expect: '0',
  source: `(program
    (module (name "t398") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body
          (match (list)
            (case (tag "nil") 0)
            (case (tag "cons" (h t)) 1)
          )
        )
      )
    )
  )`
};

export const t399_async_match_list_cons: TestCase = {
  name: 'Test 399: async match list cons',
  expect: '1',
  source: `(program
    (module (name "t399") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body
          (match (list 1 2 3)
            (case (tag "nil") 0)
            (case (tag "cons" (h t)) h)
          )
        )
      )
    )
  )`
};

export const t400_async_match_list_cons_two_vars: TestCase = {
  name: 'Test 400: async match list cons two vars',
  expect: '2',
  source: `(program
    (module (name "t400") (version 0))
    (defs
      (deffn (name main) (args) (ret I64) (eff !Pure)
        (body
          (match (list 1 2 3)
            (case (tag "nil") 0)
            (case (tag "cons" (h t)) (list.length t))
          )
        )
      )
    )
  )`
};

