import { TestCase } from '../src/test-types';

export const t03: TestCase = {
  name: 'Test 03: if',
  expect: '9',
  source: `(program
 (module (name "t03") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (if (<= 3 3) 9 10)))))`
};
