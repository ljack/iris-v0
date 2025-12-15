import { TestCase } from '../src/test-types';

export const t58: TestCase = {
  name: 'Test 58: Record missing required field',
  expect: 'TypeError: Expression type mismatch',
  source: `(program
 (module (name "t58") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (a I64) (b I64) (c I64)))
    (eff !Pure)
    (body (record (a 1) (b 2))))))`
};
