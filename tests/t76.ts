import { TestCase } from '../src/test-types';

export const t76: TestCase = {
  name: 'Test 76: If-then-else with both branches returning same type',
  expect: '42',
  source: `(program
 (module (name "t76") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (if true
        42
        0))))))`
};
