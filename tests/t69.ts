import { TestCase } from '../src/test-types';

export const t69: TestCase = {
  name: 'Test 69: Empty string',
  expect: '""',
  source: `(program
 (module (name "t69") (version 0))
 (defs
  (deffn (name main)
    (args) (ret Str) (eff !Pure)
    (body ""))))`
};
