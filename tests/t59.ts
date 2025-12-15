import { TestCase } from '../src/test-types';

export const t59: TestCase = {
  name: 'Test 59: Nested record types',
  expect: '(record (a (record (x 1))))',
  source: `(program
 (module (name "t59") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record (a (Record (x I64)))))
    (eff !Pure)
    (body (record (a (record (x 1)))))))`
};
