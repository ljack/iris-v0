import { TestCase } from '../src/test-types';

export const t15: TestCase = {
  name: 'Test 15: undefined function',
  expect: 'TypeError: Unknown function call: no_such_fn',
  source: `(program
 (module (name "t15") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (no_such_fn 1)))))`
};
