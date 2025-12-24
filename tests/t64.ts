import { TestCase } from '../src/test-types';

export const t64: TestCase = {
  name: 'Test 64: Type error in deeply nested function call',
  expect: 'TypeError: Argument 0 mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t64") (version 0))
 (defs
  (deffn (name f)
    (args (x I64)) (ret I64) (eff !Pure)
    (body (+ x 1)))
  (deffn (name g)
    (args (y I64)) (ret I64) (eff !Pure)
    (body (f y)))
  (deffn (name h)
    (args (z I64)) (ret I64) (eff !Pure)
    (body (g z)))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (h "bad")))))`
};
