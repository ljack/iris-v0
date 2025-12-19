import { TestCase } from '../src/test-types';

export const t39: TestCase = {
  name: 'Test 39: Unknown Intrinsic',
  expect: 'TypeError: Unknown function call: foo.bar',
  source: `(program
 (module (name "t39") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (foo.bar 1)))))`
};
