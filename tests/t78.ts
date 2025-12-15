import { TestCase } from '../src/test-types';

export const t78: TestCase = {
  name: 'Test 78: If-then-else branch type mismatch',
  expect: 'TypeError: If branches mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t78") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (if true
        42
        "not a number")))))`
};
