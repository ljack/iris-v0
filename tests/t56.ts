import { TestCase } from '../src/test-types';

export const t56: TestCase = {
  name: 'Test 56: Record with multiple fields sorted correctly',
  expect: '(record (a 1) (b 2) (c 3))',
  source: `(program
 (module (name "t56") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (a I64) (b I64) (c I64)))
    (eff !Pure)
    (body (record (c 3) (a 1) (b 2))))))`
};
