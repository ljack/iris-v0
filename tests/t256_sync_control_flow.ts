import { TestCase } from '../src/test-types';

// Advanced tests for sync evaluation - Control Flow and Intrinsics

export const t256_sync_tco_let: TestCase = {
    name: 'Test 256: sync TCO let binding',
    expect: '30',
    source: `(program
 (module (name "t256") (version 0))
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

export const t257_sync_tco_if: TestCase = {
    name: 'Test 257: sync TCO if',
    expect: '10',
    source: `(program
 (module (name "t257") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (if true 10 20)))))`
};

export const t258_sync_tco_call: TestCase = {
    name: 'Test 258: sync TCO tail call',
    expect: '42',
    source: `(program
 (module (name "t258") (version 0))
 (defs
  (deffn (name helper)
    (args (x I64))
    (ret I64)
    (eff !Pure)
    (body x))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (helper 42)))))`
};

export const t268_sync_normalize_literal: TestCase = {
    name: 'Test 268: sync normalize literal in equality',
    expect: 'true',
    source: `(program
 (module (name "t268") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (= 42 42)))))`
};

export const t269_sync_bool_ops: TestCase = {
    name: 'Test 269: sync bool ops & |',
    expect: 'true',
    source: `(program
 (module (name "t269") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (&& true (|| false true))))))`
};

export const t270_sync_not_operator: TestCase = {
    name: 'Test 270: sync Not operator',
    expect: 'true',
    source: `(program
 (module (name "t270") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Bool)
    (eff !Pure)
    (body (! false)))))`
};
