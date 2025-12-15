import { TestCase } from '../src/test-types';

export const t62: TestCase = {
  name: 'Test 62: Function arity mismatch - too many arguments',
  expect: 'TypeError: Arity mismatch for add_one',
  source: `(program
 (module (name "t62") (version 0))
 (defs
  (deffn (name add_one)
    (args (x I64)) (ret I64) (eff !Pure)
    (body (+ x 1)))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call add_one 5 10)))))`
};
