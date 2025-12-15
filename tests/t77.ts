import { TestCase } from '../src/test-types';

export const t77: TestCase = {
  name: 'Test 77: If condition must be boolean',
  expect: 'TypeError: Type Error in If condition: Expected Bool, got I64',
  source: `(program
 (module (name "t77") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (if 1
        42
        0))))))`
};
