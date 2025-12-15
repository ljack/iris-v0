import { TestCase } from '../src/test-types';

export const t63: TestCase = {
  name: 'Test 63: Function arity mismatch - too few arguments',
  expect: 'TypeError: Arity mismatch for multi_arg',
  source: `(program
 (module (name "t63") (version 0))
 (defs
  (deffn (name multi_arg)
    (args (x I64) (y I64) (z I64)) (ret I64) (eff !Pure)
    (body (+ x (+ y z))))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call multi_arg 5)))))`
};
