import { TestCase } from '../src/test-types';

export const t70: TestCase = {
  name: 'Test 70: Arithmetic with negative and positive',
  expect: '5',
  source: `(program
 (module (name "t70") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (- (+ 10 (- 0 5)) 0)))))`
};
