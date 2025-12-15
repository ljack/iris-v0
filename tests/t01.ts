import { TestCase } from '../src/test-types';

export const t01: TestCase = {
  name: 'Test 01: pure add',
  expect: '3',
  source: `(program
 (module (name "t01") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ 1 2)))))`
};
