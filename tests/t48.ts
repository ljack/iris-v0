import { TestCase } from '../src/test-types';

export const t48: TestCase = {
  name: 'Test 48: Type error in recursive call argument',
  expect: 'TypeError: Argument 0 mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t48") (version 0))
 (defs
  (deffn (name countdown)
    (args (n I64)) (ret I64) (eff !Pure)
    (body
      (if (<= n 0)
        0
        (call countdown "oops"))))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call countdown 5)))))`
};
