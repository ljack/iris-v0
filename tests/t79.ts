import { TestCase } from '../src/test-types';

export const t79: TestCase = {
  name: 'Test 79: Complex nested if with type consistency',
  expect: '2',
  source: `(program
 (module (name "t79") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (if true
        (if false
          1
          2)
        (if true
          42
          3)))))))`
};
