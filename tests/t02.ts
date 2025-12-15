import { TestCase } from '../src/test-types';

export const t02: TestCase = {
  name: 'Test 02: let + arithmetic',
  expect: '42',
  source: `(program
 (module (name "t02") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (let (x (* 6 7))
        x)))))`
};
