import { TestCase } from '../src/test-types';

export const t13: TestCase = {
  name: 'Test 13: type error if condition',
  expect: 'TypeError: Type Error in If condition: Expected Bool, got I64',
  source: `(program
 (module (name "t13") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if 1 2 3)))))`
};
