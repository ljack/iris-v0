import { TestCase } from '../src/test-types';

export const t12: TestCase = {
  name: 'Test 12: record field order',
  expect: '(record (a 1) (b 2))',
  source: `(program
 (module (name "t12") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (a I64) (b I64)))
    (eff !Pure)
    (body (record (b 2) (a 1))))))`
};
