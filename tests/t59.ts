import { TestCase } from '../src/test-types';

export const t59: TestCase = {
  name: 'Test 59: Nested record with call',
  expect: `(record (a (record (x 1))))`,
  source: `(program
  (module (name "t59") (version 0))
  (defs
    (deffn (name inner)
      (args) (ret (Record (x I64))) (eff !Pure)
      (body (record (x 1))))
    (deffn (name main)
      (args)
      (ret (Record (a (Record (x I64)))))
      (eff !Pure)
      (body (record (a (call inner)))))))`
};
